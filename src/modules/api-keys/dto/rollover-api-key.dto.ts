import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RolloverApiKeyDto {
  @ApiProperty({
    description: 'ID of the expired API key to rollover',
    example: 'FGH2485K6KK79GKG9GKGK',
  })
  @IsString()
  @IsNotEmpty()
  expired_key_id: string;

  @ApiProperty({
    description:
      'New expiry duration: 1H (Hour), 1D (Day), 1M (Month), 1Y (Year)',
    example: '1M',
    enum: ['1H', '1D', '1M', '1Y'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['1H', '1D', '1M', '1Y'], {
    message: 'expiry must be one of: 1H, 1D, 1M, 1Y',
  })
  expiry: string;
}
