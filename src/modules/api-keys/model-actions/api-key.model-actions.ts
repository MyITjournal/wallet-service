import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { Injectable } from '@nestjs/common';
import { AbstractModelAction } from '@hng-sdk/orm';

@Injectable()
export class ApiKeyModelActions extends AbstractModelAction<ApiKey> {
  constructor(
    @InjectRepository(ApiKey)
    apiKeyRepository: Repository<ApiKey>,
  ) {
    super(apiKeyRepository, ApiKey);
  }

  /**
   * Find API key by key string
   */
  async findByKey(key: string): Promise<ApiKey | null> {
    return this.repository.findOne({
      where: { key },
      relations: ['created_by'],
    });
  }

  /**
   * Find API key by ID with creator relation and optional userId filter
   */
  async findByIdWithCreator(id: string, userId?: string): Promise<ApiKey | null> {
    const where: any = { id };
    if (userId) {
      where.created_by = { id: userId };
    }
    return this.repository.findOne({
      where,
      relations: ['created_by'],
    });
  }

  /**
   * Find all API keys for a user
   */
  async findByUserId(userId: string): Promise<ApiKey[]> {
    return this.repository.find({
      where: { created_by: { id: userId } },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Count active API keys for a user
   */
  async countActiveByUserId(userId: string): Promise<number> {
    return this.repository.count({
      where: {
        created_by: { id: userId },
        is_active: true,
      },
    });
  }

  /**
   * Create a new API key
   */
  async createApiKey(data: {
    name: string;
    key: string;
    description?: string;
    created_by: any;
    permissions: string[];
    rate_limit_per_hour: number;
    rate_limit_per_day: number;
    expires_at: Date;
    ip_whitelist?: string;
    is_active: boolean;
  }): Promise<ApiKey> {
    return this.create({
      createPayload: data,
      transactionOptions: { useTransaction: false },
    });
  }

  /**
   * Update API key
   */
  async updateApiKey(apiKey: ApiKey): Promise<ApiKey> {
    return this.save({
      entity: apiKey,
      transactionOptions: { useTransaction: false },
    });
  }

  /**
   * Find expired API key for rollover
   */
  async findExpiredKeyForRollover(
    keyId: string,
    userId: string,
  ): Promise<ApiKey | null> {
    return this.repository.findOne({
      where: {
        id: keyId,
        created_by: { id: userId },
        is_active: false,
      },
      relations: ['created_by'],
    });
  }
}
