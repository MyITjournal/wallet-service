import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionModelActions } from './model-actions/transaction.model-actions';
import { PaystackApiService } from './services/paystack-api.service';

/**
 * SharedModule - Contains entities, services, and actions shared across multiple modules
 * 
 * Exports:
 * - Transaction entity (for payment tracking across wallet and payment modules)
 * - TransactionModelActions (business logic for transaction operations)
 * - PaystackApiService (Paystack payment gateway integration)
 */
@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  providers: [TransactionModelActions, PaystackApiService],
  exports: [
    TypeOrmModule,
    TransactionModelActions,
    PaystackApiService,
  ],
})
export class SharedModule {}
