import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Transaction } from './entities/transaction.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { SYS_MESSAGES } from '../../common/constants/sys-messages';
import { PaymentModelActions } from './actions/payment.actions';

@Injectable()
export class PaymentsService {
  private paymentActions: PaymentModelActions;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly configService: ConfigService,
  ) {
    this.paymentActions = new PaymentModelActions(
      transactionRepository,
      configService,
    );
  }

  async initiatePayment(
    dto: InitiatePaymentDto,
    userId?: number,
    userEmail?: string,
  ) {
    if (!dto.amount || dto.amount <= 0 || !Number.isInteger(dto.amount)) {
      throw new BadRequestException(SYS_MESSAGES.INVALID_INPUT);
    }

    // Check for duplicate transaction (idempotency)
    const existingTransaction =
      await this.paymentActions.findRecentDuplicateTransaction(
        dto.amount,
        userId,
      );

    if (existingTransaction) {
      return {
        reference: existingTransaction.reference,
        authorization_url: existingTransaction.authorization_url,
      };
    }

    // Generate unique reference
    const reference = this.paymentActions.generateReference();

    // Use authenticated user's email or default
    const email = userEmail || 'guest@example.com';

    // Initialize payment with Paystack (throws on error)
    const paystackData =
      await this.paymentActions.initializePaystackTransaction(
        reference,
        dto.amount,
        email,
      );

    // Create transaction record
    await this.paymentActions.createTransaction(
      reference,
      dto.amount,
      paystackData.authorization_url,
      userId,
    );

    return {
      reference,
      authorization_url: paystackData.authorization_url,
    };
  }

  async handleWebhook(signature: string, payload: any) {
    // Verify signature (throws on error)
    const isValid = this.paymentActions.verifyWebhookSignature(
      signature,
      payload,
    );

    if (!isValid) {
      throw new BadRequestException(SYS_MESSAGES.INVALID_SIGNATURE);
    }

    // Validate payload structure
    if (!payload.data || !payload.data.reference || !payload.data.status) {
      throw new BadRequestException(SYS_MESSAGES.INVALID_INPUT);
    }

    const { reference, status } = payload.data;

    // Find and update transaction
    const transaction =
      await this.paymentActions.findTransactionByReference(reference);

    if (transaction) {
      await this.paymentActions.updateTransactionStatus(
        transaction,
        status,
        status === 'success' ? new Date() : undefined,
      );
    }

    return { status: true };
  }

  async getTransactionStatus(reference: string, refresh: boolean = false) {
    // Get transaction from DB
    let transaction =
      await this.paymentActions.findTransactionByReference(reference);

    // If missing or refresh requested, verify with Paystack
    if (!transaction || refresh) {
      const paystackData =
        await this.paymentActions.verifyTransactionWithPaystack(reference);

      if (!transaction) {
        // Create new transaction from Paystack data
        transaction =
          await this.paymentActions.createTransactionFromPaystack(paystackData);
      } else {
        // Update existing transaction
        await this.paymentActions.updateTransactionStatus(
          transaction,
          paystackData.status,
          paystackData.paid_at ? new Date(paystackData.paid_at) : undefined,
        );
      }
    }

    if (!transaction) {
      throw new NotFoundException(SYS_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount * 100,
      paid_at: transaction.paid_at,
    };
  }

  async getUserTransactions(userId: number) {
    const transactions = await this.paymentActions.findUserTransactions(userId);

    return transactions.map((transaction) => ({
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount * 100,
      paid_at: transaction.paid_at,
      created_at: transaction.created_at,
    }));
  }
}
