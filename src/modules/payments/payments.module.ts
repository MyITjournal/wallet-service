import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Transaction } from './entities/transaction.entity';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentModelActions } from './model-actions/payment.model-actions';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    forwardRef(() => WalletModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentModelActions],
  exports: [PaymentsService],
})
export class PaymentsModule {}
