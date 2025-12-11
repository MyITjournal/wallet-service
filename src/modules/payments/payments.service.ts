import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { SYS_MESSAGES } from '../../common/constants/sys-messages';
import { TransactionModelActions } from '../shared/model-actions/transaction.model-actions';
import { PaystackApiService } from '../shared/services/paystack-api.service';
import { WalletService } from '../wallet/wallet.service';
import { PaystackWebhookPayload } from '../../common/interfaces/paystack.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly transactionActions: TransactionModelActions,
    private readonly paystackApi: PaystackApiService,
    private readonly walletService: WalletService,
  ) {}

  async initiatePayment(
    dto: InitiatePaymentDto,
    userId?: string,
    userEmail?: string,
  ) {
    if (!dto.amount || dto.amount <= 0 || !Number.isInteger(dto.amount)) {
      throw new BadRequestException(SYS_MESSAGES.INVALID_INPUT);
    }

    // Check for duplicate transaction (idempotency)
    const existingTransaction =
      await this.transactionActions.findRecentDuplicateTransaction(
        dto.amount,
        userId,
      );

    if (existingTransaction) {
      return {
        reference: existingTransaction.reference,
        authorization_url: existingTransaction.authorization_url,
      };
    }

    // Generate unique reference with retry logic
    let reference: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      reference = this.paystackApi.generateReference();
      const exists = await this.transactionActions.checkReferenceExists(reference);
      if (!exists) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new InternalServerErrorException(
        'Failed to generate unique payment reference',
      );
    }

    // Use authenticated user's email or default
    const email = userEmail || 'guest@example.com';

    // Initialize payment with Paystack (throws on error)
    const paystackData = await this.paystackApi.initializeTransaction(
      reference,
      dto.amount,
      email,
    );

    // Create transaction record
    await this.transactionActions.createTransaction(
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

  async handleWebhook(signature: string, payload: PaystackWebhookPayload) {
    // Verify signature (throws on error)
    const isValid = this.paystackApi.verifyWebhookSignature(signature, payload);

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
      await this.transactionActions.findTransactionByReference(reference);

    if (transaction) {
      await this.transactionActions.updateTransactionStatus(
        transaction,
        status,
        status === 'success' ? new Date() : undefined,
      );

      // Auto-credit wallet if payment is for wallet funding
      if (status === 'success' && reference.startsWith('fw_')) {
        try {
          await this.walletService.creditWalletFromPayment(reference);
        } catch (error) {
          console.error('Failed to credit wallet:', error);
          // Don't fail the webhook - just log the error
        }
      }
    }

    return { status: true };
  }

  async getTransactionStatus(reference: string, refresh: boolean = false) {
    // Get transaction from DB
    let transaction =
      await this.transactionActions.findTransactionByReference(reference);

    // If missing or refresh requested, verify with Paystack
    if (!transaction || refresh) {
      const paystackData = await this.paystackApi.verifyTransaction(reference);

      if (!transaction) {
        // Create new transaction from Paystack data
        transaction =
          await this.transactionActions.createTransactionFromPaystack(paystackData);
      } else {
        // Update existing transaction
        await this.transactionActions.updateTransactionStatus(
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

  async getUserTransactions(userId: string) {
    const transactions = await this.transactionActions.findUserTransactions(userId);

    return transactions.map((transaction) => ({
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount * 100,
      paid_at: transaction.paid_at,
      created_at: transaction.created_at,
    }));
  }
}
