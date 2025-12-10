import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ApiKeyUsageLog } from '../entities/api-key-usage-log.entity';
import { Injectable } from '@nestjs/common';
import { AbstractModelAction } from '@hng-sdk/orm';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyUsageLogModelActions extends AbstractModelAction<ApiKeyUsageLog> {
  constructor(
    @InjectRepository(ApiKeyUsageLog)
    usageLogRepository: Repository<ApiKeyUsageLog>,
  ) {
    super(usageLogRepository, ApiKeyUsageLog);
  }

  /**
   * Create usage log entry
   */
  async createLog(data: {
    api_key: ApiKey;
    endpoint: string;
    method: string;
    status_code: number;
    ip_address?: string;
    user_agent?: string;
    response_time_ms?: number;
    error_message?: string;
  }): Promise<ApiKeyUsageLog> {
    return this.create({
      createPayload: data,
      transactionOptions: { useTransaction: false },
    });
  }

  /**
   * Find usage logs for an API key
   */
  async findByApiKeyId(
    apiKeyId: string,
    startDate?: Date,
  ): Promise<ApiKeyUsageLog[]> {
    const where: any = { api_key: { id: apiKeyId } };
    if (startDate) {
      where.logged_at = Between(startDate, new Date());
    }
    return this.repository.find({
      where,
      order: { logged_at: 'DESC' },
      take: 1000,
    });
  }

  /**
   * Find usage logs within date range
   */
  async findByDateRange(
    apiKeyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ApiKeyUsageLog[]> {
    return this.repository.find({
      where: {
        api_key: { id: apiKeyId },
        created_at: Between(startDate, endDate),
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Count usage for rate limiting
   */
  async countRecentUsage(apiKeyId: string, since: Date): Promise<number> {
    return this.repository.count({
      where: {
        api_key: { id: apiKeyId },
        logged_at: MoreThan(since),
      },
    });
  }
}
