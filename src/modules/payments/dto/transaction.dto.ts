import { IsString, IsOptional } from 'class-validator';
import { TransactionStatus } from '../../../common/enums';

export class WebhookPayloadDto {
  @IsString()
  event: string;

  @IsOptional()
  data?: {
    reference: string;
    status: string;
    amount?: number;
    paid_at?: string;
    customer?: {
      email: string;
    };
  };
}

export class VerifyTransactionDto {
  @IsString()
  reference: string;
}

export class TransactionResponseDto {
  id: string;
  reference: string;
  amount: number;
  status: TransactionStatus;
  authorization_url: string;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}
