import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  permissions: string[];

  @IsString()
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;

  @IsString()
  @IsOptional()
  description?: string;

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

  @IsString()
  @IsOptional()
  ip_whitelist?: string;
}
