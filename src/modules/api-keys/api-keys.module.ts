import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyUsageLog } from './entities/api-key-usage-log.entity';
import { ApiKeyModelActions } from './model-actions/api-key.model-actions';
import { ApiKeyUsageLogModelActions } from './model-actions/api-key-usage-log.model-actions';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, ApiKeyUsageLog])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyModelActions, ApiKeyUsageLogModelActions],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
