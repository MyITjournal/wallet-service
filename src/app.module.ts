import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [UsersModule, PaymentModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
