import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyUsageLog } from './entities/api-key-usage-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, ApiKeyUsageLog])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
