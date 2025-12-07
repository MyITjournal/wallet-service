import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SYS_MESSAGES } from '../../../common/constants/sys-messages';
import axios from 'axios';
import * as crypto from 'crypto';

export class PaymentModelActions {
  private paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly configService: ConfigService,
  ) {}

  async findRecentDuplicateTransaction(amount: number, userId?: number) {
    const where: any = {
      amount: amount / 100,
      status: TransactionStatus.PENDING,
    };

    if (userId) {
      where.user = { id: userId };
    }

    const existingTransaction = await this.transactionRepository.findOne({
      where,
      order: { created_at: 'DESC' },
    });

    if (existingTransaction) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (existingTransaction.created_at > fiveMinutesAgo) {
        return existingTransaction;
      }
    }

    return null;
  }

  async initializePaystackTransaction(
    reference: string,
    amount: number,
    email: string,
  ) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new InternalServerErrorException(SYS_MESSAGES.PAYMENT_CONFIG_ERROR);
    }

    const response = await axios.post(
      `${this.paystackBaseUrl}/transaction/initialize`,
      {
        amount,
        email,
        reference,
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (
      !response.data ||
      !response.data.data ||
      !response.data.data.authorization_url
    ) {
      throw new HttpException(
        SYS_MESSAGES.PAYMENT_INITIATION_FAILED,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return response.data.data;
  }

  async createTransaction(
    reference: string,
    amount: number,
    authorizationUrl: string,
    userId?: number,
  ) {
    const transactionData: any = {
      reference,
      amount: amount / 100,
      authorization_url: authorizationUrl,
      status: TransactionStatus.PENDING,
    };

    if (userId) {
      transactionData.user = { id: userId };
    }

    const transaction = this.transactionRepository.create(transactionData);

    return await this.transactionRepository.save(transaction);
  }

  verifyWebhookSignature(signature: string, payload: any): boolean {
    const webhookSecret = this.configService.get<string>(
      'PAYSTACK_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new InternalServerErrorException(
        SYS_MESSAGES.WEBHOOK_SECRET_NOT_CONFIGURED,
      );
    }

    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  async findTransactionByReference(reference: string) {
    return await this.transactionRepository.findOne({
      where: { reference },
      relations: ['user'],
    });
  }

  async findUserTransactions(userId: number) {
    return await this.transactionRepository.find({
      where: { user: { id: userId } as any },
      order: { created_at: 'DESC' },
      relations: ['user'],
    });
  }

  async updateTransactionStatus(
    transaction: Transaction,
    status: string,
    paidAt?: Date,
  ) {
    transaction.status = this.mapPaystackStatus(status);
    if (status === 'success' && paidAt) {
      transaction.paid_at = paidAt;
    }

    return await this.transactionRepository.save(transaction);
  }

  async verifyTransactionWithPaystack(reference: string) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new InternalServerErrorException(SYS_MESSAGES.PAYMENT_CONFIG_ERROR);
    }

    const response = await axios.get(
      `${this.paystackBaseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    return response.data.data;
  }

  async createTransactionFromPaystack(paystackData: any) {
    const transaction = this.transactionRepository.create({
      reference: paystackData.reference,
      amount: paystackData.amount / 100,
      status: this.mapPaystackStatus(paystackData.status),
      authorization_url: '',
      paid_at: paystackData.paid_at
        ? new Date(paystackData.paid_at)
        : undefined,
    });

    return await this.transactionRepository.save(transaction);
  }

  private mapPaystackStatus(paystackStatus: string): TransactionStatus {
    const statusMap = {
      success: TransactionStatus.SUCCESS,
      failed: TransactionStatus.FAILED,
      pending: TransactionStatus.PENDING,
    };
    return statusMap[paystackStatus] || TransactionStatus.PENDING;
  }

  generateReference(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
