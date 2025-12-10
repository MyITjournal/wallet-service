import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../../../common/enums';
import { Injectable } from '@nestjs/common';
import { AbstractModelAction } from '@hng-sdk/orm';
import { PaystackTransactionData } from '../../../common/interfaces/paystack.interface';

@Injectable()
export class TransactionModelActions extends AbstractModelAction<Transaction> {
  constructor(
    @InjectRepository(Transaction)
    transactionRepository: Repository<Transaction>,
  ) {
    super(transactionRepository, Transaction);
  }

  /**
   * Find recent duplicate pending transaction
   */
  async findRecentDuplicateTransaction(
    amount: number,
    userId?: string,
  ): Promise<Transaction | null> {
    const where: FindOptionsWhere<Transaction> = {
      amount: amount / 100,
      status: TransactionStatus.PENDING,
    };

    if (userId) {
      where.user = { id: userId };
    }

    const existingTransaction = await this.repository.findOne({
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

  /**
   * Check if transaction reference exists
   */
  async checkReferenceExists(reference: string): Promise<boolean> {
    const count = await this.repository.count({ where: { reference } });
    return count > 0;
  }

  /**
   * Create a new transaction record
   */
  async createTransaction(
    reference: string,
    amount: number,
    authorizationUrl: string,
    userId?: string,
  ): Promise<Transaction> {
    const transactionData: DeepPartial<Transaction> = {
      reference,
      amount: amount / 100,
      authorization_url: authorizationUrl,
      status: TransactionStatus.PENDING,
    };

    if (userId) {
      transactionData.user = { id: userId };
    }

    return this.create({
      createPayload: transactionData,
      transactionOptions: { useTransaction: false },
    });
  }

  /**
   * Find transaction by reference with user relation
   */
  async findTransactionByReference(
    reference: string,
  ): Promise<Transaction | null> {
    return this.repository.findOne({
      where: { reference },
      relations: ['user'],
    });
  }

  /**
   * Find all transactions for a user
   */
  async findUserTransactions(userId: string): Promise<Transaction[]> {
    return this.repository.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
      relations: ['user'],
    });
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transaction: Transaction,
    status: string,
    paidAt?: Date,
  ): Promise<Transaction> {
    transaction.status = this.mapPaystackStatus(status);
    if (status === 'success' && paidAt) {
      transaction.paid_at = paidAt;
    }

    return this.save({
      entity: transaction,
      transactionOptions: { useTransaction: false },
    });
  }

  /**
   * Create transaction from Paystack data
   */
  async createTransactionFromPaystack(
    paystackData: PaystackTransactionData,
  ): Promise<Transaction> {
    const transactionData = {
      reference: paystackData.reference,
      amount: (paystackData.amount || 0) / 100,
      status: this.mapPaystackStatus(paystackData.status),
      authorization_url: paystackData.authorization_url || '',
      paid_at: paystackData.paid_at
        ? new Date(paystackData.paid_at)
        : undefined,
    };

    return this.create({
      createPayload: transactionData,
      transactionOptions: { useTransaction: false },
    });
  }

  /**
   * Map Paystack status to internal TransactionStatus
   */
  private mapPaystackStatus(paystackStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      success: TransactionStatus.SUCCESS,
      failed: TransactionStatus.FAILED,
      pending: TransactionStatus.PENDING,
    };
    return statusMap[paystackStatus] || TransactionStatus.PENDING;
  }
}
