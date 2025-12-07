import { IsNumber, IsPositive, IsEmail, IsOptional } from 'class-validator';

export class InitiatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number; // Amount in kobo (smallest currency unit because of precision)

  @IsEmail()
  @IsOptional()
  email?: string; // Optional: expected from authenticated user in production
}
