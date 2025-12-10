import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Transaction } from '../shared/entities/transaction.entity';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { TransferWalletDto } from './dto/transfer-wallet.dto';
import { WalletTransactionType, TransactionStatus } from '../../common/enums';
import { WalletModelActions } from './model-actions/wallet.model-actions';
import { WalletTransactionModelActions } from './model-actions/wallet-transaction.model-actions';
import { TransactionModelActions } from '../shared/model-actions/transaction.model-actions';
import { PaystackApiService } from '../shared/services/paystack-api.service';
import { UserModelActions } from '../users/model-actions/user.model-actions';
import { PaystackWebhookPayload } from '../../common/interfaces/paystack.interface';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletActions: WalletModelActions,
    private readonly walletTransactionActions: WalletTransactionModelActions,
    private readonly transactionActions: TransactionModelActions,
    private readonly paystackApi: PaystackApiService,
    private readonly userActions: UserModelActions,
    private readonly dataSource: DataSource,
  ) {}

  async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletActions.findByUserId(userId);

    if (!wallet) {
      const user = await this.userActions.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Generate unique wallet number
      const wallet_number = await this.generateWalletNumber();

      wallet = await this.walletActions.createForUser(userId, wallet_number);
    }

    return wallet;
  }

  private async generateWalletNumber(): Promise<string> {
    let walletNumber = '';
    let exists = true;

    while (exists) {
      // Generate random 13-digit number
      walletNumber = Math.floor(
        1000000000000 + Math.random() * 9000000000000,
      ).toString();

      exists = await this.walletActions.walletNumberExists(walletNumber);
    }

    return walletNumber;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: Number(wallet.balance),
    };
  }

  async initiateFunding(userId: string, dto: FundWalletDto) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.isLocked) {
      throw new ForbiddenException('Wallet is locked');
    }

    const reference = `WALLET_FUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const response = await this.paystackApi.initializeTransaction(
        reference,
        dto.amount,
        wallet.user.email,
      );

      await this.transactionActions.createTransaction(
        reference,
        dto.amount, // Already in kobo
        response.authorization_url,
        wallet.user.id,
      );

      return {
        reference,
        authorization_url: response.authorization_url,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? String(
              (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message || 'Failed to initialize payment',
            )
          : 'Failed to initialize payment';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async creditWalletFromPayment(paymentReference: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Transaction, {
        where: { reference: paymentReference },
        relations: ['user'],
      });

      if (!payment || payment.status !== TransactionStatus.SUCCESS) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const existingWalletTx = await queryRunner.manager.findOne(
        WalletTransaction,
        {
          where: { reference: paymentReference },
        },
      );

      if (existingWalletTx) {
        await queryRunner.rollbackTransaction();
        return;
      }

      // Get wallet with lock
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { user: { id: payment.user.id } },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const amount = Number(payment.amount);
      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      const walletTransaction = queryRunner.manager.create(WalletTransaction, {
        wallet,
        type: WalletTransactionType.CREDIT,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        status: TransactionStatus.SUCCESS,
        reference: paymentReference,
        description: 'Wallet funding via Paystack',
      });

      await queryRunner.manager.save(walletTransaction);

      wallet.balance = balanceAfter;
      wallet.totalFunded = Number(wallet.totalFunded) + amount;
      await queryRunner.manager.save(wallet);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async initiateWithdrawal(userId: string, dto: WithdrawWalletDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { user: { id: userId } },
        relations: ['user'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.isLocked) {
        throw new ForbiddenException('Wallet is locked');
      }

      const amount = dto.amount / 100; // Convert to main currency
      if (Number(wallet.balance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const reference = `WALLET_WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore - amount;

      const walletTransaction = queryRunner.manager.create(WalletTransaction, {
        wallet,
        type: WalletTransactionType.DEBIT,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        status: TransactionStatus.PENDING,
        reference,
        description: 'Withdrawal to bank account',
        metadata: JSON.stringify({
          account_number: dto.account_number,
          bank_code: dto.bank_code,
        }),
      });

      await queryRunner.manager.save(walletTransaction);

      wallet.balance = balanceAfter;
      await queryRunner.manager.save(wallet);

      await queryRunner.commitTransaction();

      try {
        await this.initiatePaystackTransfer(
          reference,
          dto.amount,
          dto.account_number,
          dto.bank_code,
        );
      } catch (error) {
        await this.handleFailedWithdrawal(walletTransaction.id, amount);
        throw error;
      }

      return {
        reference,
        amount,
        status: 'pending',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async initiatePaystackTransfer(
    reference: string,
    amount: number,
    accountNumber: string,
    bankCode: string,
  ) {
    const recipientCode = await this.paystackApi.createTransferRecipient(
      accountNumber,
      bankCode,
      'Wallet Withdrawal',
    );

    await this.paystackApi.initiateTransfer(amount, recipientCode, reference);
  }

  private async handleFailedWithdrawal(transactionId: string, amount: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const walletTx = await queryRunner.manager.findOne(WalletTransaction, {
        where: { id: transactionId },
        relations: ['wallet'],
        lock: { mode: 'pessimistic_write' },
      });

      if (walletTx) {
        walletTx.status = TransactionStatus.FAILED;
        await queryRunner.manager.save(walletTx);

        walletTx.wallet.balance = Number(walletTx.wallet.balance) + amount;
        await queryRunner.manager.save(walletTx.wallet);
      }

      await queryRunner.commitTransaction();
    } catch {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async transferToUser(senderId: string, dto: TransferWalletDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const senderWallet = await queryRunner.manager.findOne(Wallet, {
        where: { user: { id: senderId } },
        relations: ['user'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      if (senderWallet.isLocked) {
        throw new ForbiddenException('Your wallet is locked');
      }

      const recipientWallet = await queryRunner.manager.findOne(Wallet, {
        where: { walletNumber: dto.wallet_number },
        relations: ['user'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!recipientWallet) {
        throw new NotFoundException('Recipient wallet not found');
      }

      if (recipientWallet.user.id === senderId) {
        throw new BadRequestException('Cannot transfer to yourself');
      }

      if (recipientWallet.isLocked) {
        throw new ForbiddenException('Recipient wallet is locked');
      }

      const amount = dto.amount / 100;
      if (Number(senderWallet.balance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const reference = `TRANSFER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const senderBalanceBefore = Number(senderWallet.balance);
      const senderBalanceAfter = senderBalanceBefore - amount;

      const senderTransaction = queryRunner.manager.create(WalletTransaction, {
        wallet: senderWallet,
        type: WalletTransactionType.TRANSFER_OUT,
        amount,
        balance_before: senderBalanceBefore,
        balance_after: senderBalanceAfter,
        status: TransactionStatus.SUCCESS,
        reference,
        description:
          dto.description || `Transfer to wallet ${dto.wallet_number}`,
        metadata: JSON.stringify({ recipient_wallet: dto.wallet_number }),
      });

      await queryRunner.manager.save(senderTransaction);

      senderWallet.balance = senderBalanceAfter;
      await queryRunner.manager.save(senderWallet);

      const recipientBalanceBefore = Number(recipientWallet.balance);
      const recipientBalanceAfter = recipientBalanceBefore + amount;

      const recipientTransaction = queryRunner.manager.create(
        WalletTransaction,
        {
          wallet: recipientWallet,
          type: WalletTransactionType.TRANSFER_IN,
          amount,
          balance_before: recipientBalanceBefore,
          balance_after: recipientBalanceAfter,
          status: TransactionStatus.SUCCESS,
          reference,
          description:
            dto.description ||
            `Transfer from wallet ${senderWallet.walletNumber}`,
          metadata: JSON.stringify({
            sender_wallet: senderWallet.walletNumber,
          }),
        },
      );

      await queryRunner.manager.save(recipientTransaction);

      recipientWallet.balance = recipientBalanceAfter;
      recipientWallet.totalFunded =
        Number(recipientWallet.totalFunded) + amount;
      await queryRunner.manager.save(recipientWallet);

      await queryRunner.commitTransaction();

      return {
        status: 'success',
        message: 'Transfer completed',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactionHistory(userId: string, limit: number = 50) {
    const wallet = await this.getOrCreateWallet(userId);

    const transactions = await this.walletTransactionActions.getHistory(
      wallet.id,
      limit,
    );

    return transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      balance_before: Number(tx.balanceBefore),
      balance_after: Number(tx.balanceAfter),
      status: tx.status,
      reference: tx.reference,
      description: tx.description,
      metadata: tx.metadata
        ? (JSON.parse(tx.metadata) as Record<string, unknown>)
        : null,
      created_at: tx.created_at,
    }));
  }

  async handlePaystackWebhook(
    signature: string,
    payload: PaystackWebhookPayload,
  ) {
    const isValid = this.paystackApi.verifyWebhookSignature(signature, payload);
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const reference = payload.data.reference;
    const status = payload.data.status;

    const transaction =
      await this.transactionActions.findTransactionByReference(reference);

    if (transaction) {
      await this.transactionActions.updateTransactionStatus(
        transaction,
        status,
        status === 'success' ? new Date() : undefined,
      );

      if (status === 'success' && reference.startsWith('WALLET_FUND_')) {
        try {
          await this.creditWalletFromPayment(reference);
        } catch (error) {
          console.error('Failed to credit wallet:', error);
        }
      }
    }

    return { status: true };
  }

  async getDepositStatus(reference: string) {
    const transaction =
      await this.transactionActions.findTransactionByReference(reference);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount * 100, // Convert back to kobo
    };
  }
}
