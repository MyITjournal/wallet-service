import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  Param,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtOrApiKeyGuard } from '../auth/guards/jwt-or-api-key.guard';
import { CurrentUser, RequirePermission } from '../../common/decorators';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { TransferWalletDto } from './dto/transfer-wallet.dto';
import { SYS_MESSAGES } from '../../common/constants/sys-messages';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('read')
  async getBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.walletService.getBalance(user.userId);
  }

  @Post('deposit')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('deposit')
  @HttpCode(HttpStatus.CREATED)
  async fundWallet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FundWalletDto,
  ) {
    return this.walletService.initiateFunding(user.userId, dto);
  }

  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: Record<string, unknown>,
  ) {
    if (!signature) {
      throw new BadRequestException(SYS_MESSAGES.INVALID_SIGNATURE);
    }
    return this.walletService.handlePaystackWebhook(signature, payload);
  }

  @Get('deposit/:reference/status')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('read')
  async getDepositStatus(@Param('reference') reference: string) {
    if (!reference || reference.trim() === '') {
      throw new BadRequestException(SYS_MESSAGES.INVALID_INPUT);
    }
    return this.walletService.getDepositStatus(reference);
  }

  @Post('withdraw')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('transfer')
  @HttpCode(HttpStatus.CREATED)
  async withdrawFromWallet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WithdrawWalletDto,
  ) {
    return this.walletService.initiateWithdrawal(user.userId, dto);
  }

  @Post('transfer')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('transfer')
  @HttpCode(HttpStatus.CREATED)
  async transferToUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransferWalletDto,
  ) {
    return this.walletService.transferToUser(user.userId, dto);
  }

  @Get('transactions')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('read')
  async getTransactionHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.walletService.getTransactionHistory(user.userId, limit || 50);
  }
}