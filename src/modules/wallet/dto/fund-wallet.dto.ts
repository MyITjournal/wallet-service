import { IsNumber, IsPositive, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({
    description: 'Amount to deposit (in smallest currency unit)',
    example: 5000,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsInt()
  amount: number; // Amount in kobo (smallest currency unit)
}
