import { ApiProperty } from '@nestjs/swagger';

export class TransactionHistoryResponseDto {
  @ApiProperty({
    description: 'Transaction type',
    example: 'deposit',
    enum: ['deposit', 'withdraw', 'transfer'],
  })
  type: string;

  @ApiProperty({
    description:
      'Money flow - credit (money coming in) or debit (money going out)',
    example: 'credit',
    enum: ['credit', 'debit'],
  })
  flow: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 28,
  })
  amount: number;

  @ApiProperty({
    description: 'Transaction status',
    example: 'success',
  })
  status: string;
}
