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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('paystack/initiate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.initiatePayment(dto, user.userId, user.email);
  }

  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    if (!signature) {
      throw new BadRequestException(SYS_MESSAGES.INVALID_SIGNATURE);
    }
    return this.paymentsService.handleWebhook(signature, payload);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getTransactionHistory(@CurrentUser() user: any) {
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
}
