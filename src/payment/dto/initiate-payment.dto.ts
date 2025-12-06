import { IsNumber, IsPositive, IsEmail, IsOptional } from 'class-validator';

export class InitiatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number; // Amount in kobo (smallest currency unit)

  @IsEmail()
  @IsOptional()
  email?: string; // Optional: should come from authenticated user in production
}
