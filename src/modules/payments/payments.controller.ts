import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { SYS_MESSAGES } from '../../common/constants/sys-messages';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import type { PaystackWebhookPayload } from '../../common/interfaces/paystack.interface';
import type { JwtPayload } from '../../common/interfaces/jwt.interface';
import { TransactionStatus } from '../../common/enums';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('paystack/initiate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.initiatePayment(dto, user.userId, user.email);
  }

  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: PaystackWebhookPayload,
  ) {
    if (!signature) {
      throw new BadRequestException(SYS_MESSAGES.INVALID_SIGNATURE);
    }
    return this.paymentsService.handleWebhook(signature, payload);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getTransactionHistory(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.getUserTransactions(user.userId);
  }

  @Get(':reference/status')
  @UseGuards(JwtAuthGuard)
  async getTransactionStatus(
    @Param('reference') reference: string,
    @Query('refresh') refresh?: string,
  ) {
    if (!reference || reference.trim() === '') {
      throw new BadRequestException(SYS_MESSAGES.INVALID_INPUT);
    }
    return this.paymentsService.getTransactionStatus(
      reference,
      refresh === 'true',
    );
  }

  @Post(':reference/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyTransaction(@Param('reference') reference: string) {
    if (!reference || reference.trim() === '') {
      throw new BadRequestException(SYS_MESSAGES.INVALID_INPUT);
    }
    return this.paymentsService.getTransactionStatus(reference, true);
  }

  @Get('callback')
  async handleCallback(@Query('reference') reference: string) {
    if (!reference || reference.trim() === '') {
      throw new BadRequestException(SYS_MESSAGES.INVALID_INPUT);
    }

    // Auto-verify the payment and return JSON response
    return this.paymentsService.getTransactionStatus(reference, true);
  }
}
