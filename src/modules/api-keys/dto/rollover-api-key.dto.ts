import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class RolloverApiKeyDto {
  @IsString()
  @IsNotEmpty()
  expired_key_id: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['1H', '1D', '1M', '1Y'], {
    message: 'expiry must be one of: 1H, 1D, 1M, 1Y',
  })
  expiry: string;
}
