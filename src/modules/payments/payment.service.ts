import { Injectable, BadRequestException, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly configService: ConfigService,
  ) {}

  async initiatePayment(dto: InitiatePaymentDto) {
    // Generate unique reference for idempotency
    const reference = this.generateReference();

    try {
      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          amount: dto.amount,
          email: dto.email || 'user@example.com', // This is expected from an authenticated user
          reference,
        },
        {
          headers: {
            Authorization: `Bearer ${this.configService.get('PAYSTACK_SECRET_KEY')}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const transaction = this.transactionRepository.create({
        reference,
        amount: dto.amount / 100, // Convert from kobo to naira
        authorization_url: response.data.data.authorization_url,
        status: TransactionStatus.PENDING,
      });

      await this.transactionRepository.save(transaction);

      return {
        reference,
        authorization_url: response.data.data.authorization_url,
      };
    } catch (error) {
      throw new HttpException('Payment initiation failed', 402);
    }
  }

  async handleWebhook(signature: string, payload: any) {
    // Verify Paystack signature
    const webhookSecret = this.configService.get<string>(
      'PAYSTACK_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid signature');
    }

    const { reference, status } = payload.data;

    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (transaction) {
      transaction.status = this.mapPaystackStatus(status);
      if (status === 'success') {
        transaction.paid_at = new Date();
      }
      await this.transactionRepository.save(transaction);
    }

    return { status: true };
  }

  async getTransactionStatus(reference: string, refresh: boolean = false) {
    let transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    if (refresh) {
      // Verify with Paystack
      try {
        const response = await axios.get(
          `${this.paystackBaseUrl}/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${this.configService.get('PAYSTACK_SECRET_KEY')}`,
            },
          },
        );

        transaction.status = this.mapPaystackStatus(response.data.data.status);
        if (response.data.data.status === 'success') {
          transaction.paid_at = new Date(response.data.data.paid_at);
        }
        await this.transactionRepository.save(transaction);
      } catch (error) {
        throw new HttpException(
          'Failed to verify transaction with Paystack',
          500,
        );
      }
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount * 100, // Convert back to kobo
      paid_at: transaction.paid_at,
    };
  }

  private generateReference(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private mapPaystackStatus(paystackStatus: string): TransactionStatus {
    const statusMap = {
      success: TransactionStatus.SUCCESS,
      failed: TransactionStatus.FAILED,
      pending: TransactionStatus.PENDING,
    };
    return statusMap[paystackStatus] || TransactionStatus.PENDING;
  }
}
