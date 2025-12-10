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
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name of the API key',
    example: 'wallet-service',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Permissions to assign to the API key',
    example: ['deposit', 'transfer', 'read'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  permissions: string[];

  @ApiProperty({
    description: 'Expiry duration: 1H (Hour), 1D (Day), 1M (Month), 1Y (Year)',
    example: '1D',
    enum: ['1H', '1D', '1M', '1Y'],
  })
  @IsString()
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;

  @ApiHideProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiHideProperty()
  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  rate_limit_per_hour?: number;

  @ApiHideProperty()
  @IsNumber()
  @Min(1)
  @Max(100000)
  @IsOptional()
  rate_limit_per_day?: number;

  @ApiHideProperty()
  @IsString()
  @IsOptional()
  ip_whitelist?: string;
}
