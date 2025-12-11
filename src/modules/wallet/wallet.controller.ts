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
  Header,
  BadRequestException,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags, ApiSecurity } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtOrApiKeyGuard } from '../auth/guards/jwt-or-api-key.guard';
import {
  CurrentUser,
  RequirePermission,
  SkipWrap,
} from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/interfaces/jwt.interface';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import type { PaystackWebhookPayload } from '../../common/interfaces/paystack.interface';
import { TransferWalletDto } from './dto/transfer-wallet.dto';
import { TransactionHistoryResponseDto } from './dto/transaction-history-response.dto';
import { SYS_MESSAGES } from '../../common/constants/sys-messages';
import {
  ApiWalletTags,
  ApiWalletBearerAuth,
  ApiWalletDeposit,
  ApiPaystackWebhook,
  ApiVerifyDepositStatus,
  ApiGetWalletBalance,
  ApiWalletTransfer,
  ApiTransactionHistory,
} from './docs/wallet-docs.decorator';

@Controller('wallet')
@ApiWalletTags()
@ApiWalletBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('test-headers')
  @ApiExcludeEndpoint()
  async testHeaders(@Headers() headers: Record<string, string>) {
    return {
      hasApiKey: !!headers['x-api-key'],
      apiKeyPreview: headers['x-api-key']?.substring(0, 15) + '...',
      allHeaders: Object.keys(headers),
    };
  }

  @Get('balance')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('read')
  @SkipWrap()
  @ApiGetWalletBalance()
  async getBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.walletService.getBalance(user.userId);
  }

  @Post('deposit')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('deposit')
  @HttpCode(HttpStatus.CREATED)
  @SkipWrap()
  @ApiWalletDeposit()
  async fundWallet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FundWalletDto,
  ) {
    return this.walletService.initiateFunding(user.userId, dto);
  }

  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiPaystackWebhook()
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: PaystackWebhookPayload,
  ) {
    console.log('Webhook received:', {
      signature: signature || 'MISSING',
      event: payload?.event || 'UNKNOWN',
      reference: payload?.data?.reference || 'N/A',
    });

    if (!signature) {
      throw new BadRequestException(SYS_MESSAGES.INVALID_SIGNATURE);
    }
    return this.walletService.handlePaystackWebhook(signature, payload);
  }

  @Get('deposit/:reference/status')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('read')
  @SkipWrap()
  @ApiVerifyDepositStatus()
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
  @ApiExcludeEndpoint()
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
  @SkipWrap()
  @ApiWalletTransfer()
  async transferToUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransferWalletDto,
  ) {
    return this.walletService.transferToUser(user.userId, dto);
  }

  @Get('transactions')
  @UseGuards(JwtOrApiKeyGuard)
  @RequirePermission('read')
  @SkipWrap()
  @ApiTransactionHistory()
  async getTransactionHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TransactionHistoryResponseDto[]> {
    return this.walletService.getTransactionHistory(user.userId, limit || 50);
  }
}
