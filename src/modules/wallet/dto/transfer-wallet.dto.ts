import {
  IsNumber,
  IsPositive,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';

export class TransferWalletDto {
  @ApiProperty({
    description: 'Recipient wallet number',
    example: '4566678954356',
  })
  @IsString()
  walletNumber: string;

  @ApiProperty({
    description: 'Amount to transfer (in smallest currency unit)',
    example: 3000,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsInt()
  amount: number; // Amount in kobo

  @ApiHideProperty()
  @IsString()
  @IsOptional()
  description?: string;
}
