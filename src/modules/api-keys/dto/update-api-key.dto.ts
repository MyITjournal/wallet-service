import {
  IsBoolean,
  IsOptional,
  IsArray,
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  rate_limit_per_hour?: number;

  @IsNumber()
  @Min(1)
  @Max(100000)
  @IsOptional()
  rate_limit_per_day?: number;

  @IsDateString()
  @IsOptional()
  expires_at?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  ip_whitelist?: string;
}
