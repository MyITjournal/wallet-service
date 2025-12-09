import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyUsageLog } from './entities/api-key-usage-log.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(ApiKeyUsageLog)
    private readonly usageLogRepository: Repository<ApiKeyUsageLog>,
  ) {}

  // Generate a secure random API key
  private generateApiKey(): string {
    const prefix = 'sk_live_'; // Secret key prefix
    const randomString = randomBytes(32).toString('base64url');
    return `${prefix}${randomString}`;
  }

  // Convert expiry string to datetime
  private calculateExpiryDate(expiry: string): Date {
    const now = new Date();
    const expiryMap = {
      '1H': () => new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
      '1D': () => new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day
      '1M': () => new Date(now.setMonth(now.getMonth() + 1)), // 1 month
      '1Y': () => new Date(now.setFullYear(now.getFullYear() + 1)), // 1 year
    };
    return expiryMap[expiry]();
  }

  // Create a new API key
  async create(dto: CreateApiKeyDto, userId: string) {
    // Check maximum 5 active keys per user
    const activeKeysCount = await this.apiKeyRepository.count({
      where: {
        created_by: { id: userId },
        is_active: true,
      },
    });

    if (activeKeysCount >= 5) {
      throw new BadRequestException(
        'Maximum 5 active API keys allowed per user',
      );
    }

    const key = this.generateApiKey();
    const expiresAt = this.calculateExpiryDate(dto.expiry);

    const apiKey = new ApiKey();
    apiKey.key = key;
    apiKey.name = dto.name;
    if (dto.description) apiKey.description = dto.description;
    apiKey.created_by = { id: userId } as any;
    apiKey.permissions = dto.permissions;
    apiKey.rate_limit_per_hour = dto.rate_limit_per_hour || 100;
    apiKey.rate_limit_per_day = dto.rate_limit_per_day || 1000;
    apiKey.expires_at = expiresAt;
    if (dto.ip_whitelist) apiKey.ip_whitelist = dto.ip_whitelist;
    apiKey.is_active = true;

    const saved = await this.apiKeyRepository.save(apiKey);

    return {
      api_key: saved.key,
      expires_at: saved.expires_at,
    };
  }

  // List all API keys for a user (without the actual key)
  async findAll(userId: string) {
    const apiKeys = await this.apiKeyRepository.find({
      where: { created_by: { id: userId } },
      order: { created_at: 'DESC' },
    });

    return apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      description: key.description,
      permissions: key.permissions,
      rate_limit_per_hour: key.rate_limit_per_hour,
      rate_limit_per_day: key.rate_limit_per_day,
      expires_at: key.expires_at,
      last_used_at: key.last_used_at,
      is_active: key.is_active,
      created_at: key.created_at,
      key_preview: this.maskKey(key.key),
    }));
  }

  // Get a single API key by ID
  async findOne(id: string, userId: string) {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, created_by: { id: userId } },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return {
      id: apiKey.id,
      name: apiKey.name,
      description: apiKey.description,
      permissions: apiKey.permissions,
      rate_limit_per_hour: apiKey.rate_limit_per_hour,
      rate_limit_per_day: apiKey.rate_limit_per_day,
      expires_at: apiKey.expires_at,
      last_used_at: apiKey.last_used_at,
      is_active: apiKey.is_active,
      ip_whitelist: apiKey.ip_whitelist,
      created_at: apiKey.created_at,
      key_preview: this.maskKey(apiKey.key),
    };
  }

  // Update an API key
  async update(id: string, dto: UpdateApiKeyDto, userId: string) {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, created_by: { id: userId } },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    Object.assign(apiKey, {
      ...dto,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : apiKey.expires_at,
    });

    const updated = await this.apiKeyRepository.save(apiKey);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      permissions: updated.permissions,
      rate_limit_per_hour: updated.rate_limit_per_hour,
      rate_limit_per_day: updated.rate_limit_per_day,
      expires_at: updated.expires_at,
      is_active: updated.is_active,
      ip_whitelist: updated.ip_whitelist,
    };
  }

  // Delete/deactivate an API key
  async delete(id: string, userId: string) {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, created_by: { id: userId } },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    apiKey.is_active = false;
    await this.apiKeyRepository.save(apiKey);

    return { message: 'API key deactivated successfully' };
  }

  // Validate API key and check all constraints
  async validateApiKey(
    key: string,
    requiredPermission: string,
    ipAddress?: string,
  ): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { key },
      relations: ['created_by'],
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Check active status
    if (!apiKey.is_active) {
      throw new UnauthorizedException('API key is inactive');
    }

    // Check expiry
    if (apiKey.isExpired()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Check IP whitelist
    if (apiKey.ip_whitelist && ipAddress) {
      const allowedIPs = apiKey.ip_whitelist.split(',').map((ip) => ip.trim());
      if (!allowedIPs.includes(ipAddress)) {
        throw new UnauthorizedException('IP address not whitelisted');
      }
    }

    // Check permissions
    if (!apiKey.hasPermission(requiredPermission)) {
      throw new UnauthorizedException(
        `Insufficient permissions. Required: ${requiredPermission}`,
      );
    }

    // Check rate limits
    await this.checkRateLimit(apiKey);

    return apiKey;
  }

  // Check if rate limit is exceeded
  private async checkRateLimit(apiKey: ApiKey) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit
    const hourlyCount = await this.usageLogRepository.count({
      where: {
        api_key: { id: apiKey.id },
        logged_at: MoreThan(oneHourAgo),
      },
    });

    if (hourlyCount >= apiKey.rate_limit_per_hour) {
      throw new UnauthorizedException(
        `Rate limit exceeded: ${apiKey.rate_limit_per_hour} requests per hour`,
      );
    }

    // Check daily limit
    const dailyCount = await this.usageLogRepository.count({
      where: {
        api_key: { id: apiKey.id },
        logged_at: MoreThan(oneDayAgo),
      },
    });

    if (dailyCount >= apiKey.rate_limit_per_day) {
      throw new UnauthorizedException(
        `Rate limit exceeded: ${apiKey.rate_limit_per_day} requests per day`,
      );
    }
  }

  // Log API key usage
  async logUsage(
    apiKey: ApiKey,
    endpoint: string,
    method: string,
    statusCode: number,
    ipAddress?: string,
    userAgent?: string,
    responseTimeMs?: number,
    errorMessage?: string,
  ) {
    const log = this.usageLogRepository.create({
      api_key: apiKey,
      endpoint,
      method,
      ip_address: ipAddress,
      user_agent: userAgent,
      status_code: statusCode,
      response_time_ms: responseTimeMs || 0,
      error_message: errorMessage,
    });

    await this.usageLogRepository.save(log);

    // Update last_used_at
    apiKey.last_used_at = new Date();
    await this.apiKeyRepository.save(apiKey);
  }

  // Get usage statistics for an API key
  async getUsageStats(id: string, userId: string, days: number = 7) {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, created_by: { id: userId } },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.usageLogRepository.find({
      where: {
        api_key: { id: apiKey.id },
        logged_at: MoreThan(startDate),
      },
      order: { logged_at: 'DESC' },
      take: 1000,
    });

    const totalRequests = logs.length;
    const successfulRequests = logs.filter(
      (log) => log.status_code < 400,
    ).length;
    const failedRequests = logs.filter((log) => log.status_code >= 400).length;
    const avgResponseTime =
      logs.reduce((sum, log) => sum + log.response_time_ms, 0) /
        totalRequests || 0;

    // Group by day
    const dailyStats = this.groupByDay(logs);

    // Most used endpoints
    const endpointCounts = logs.reduce(
      (acc, log) => {
        acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      api_key_id: apiKey.id,
      api_key_name: apiKey.name,
      period_days: days,
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      success_rate:
        totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      avg_response_time_ms: Math.round(avgResponseTime),
      daily_stats: dailyStats,
      top_endpoints: Object.entries(endpointCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
    };
  }

  // Group logs by day
  private groupByDay(logs: ApiKeyUsageLog[]) {
    const grouped = logs.reduce(
      (acc, log) => {
        const day = log.logged_at.toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = { date: day, count: 0, errors: 0 };
        }
        acc[day].count++;
        if (log.status_code >= 400) {
          acc[day].errors++;
        }
        return acc;
      },
      {} as Record<string, { date: string; count: number; errors: number }>,
    );

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }

  // Mask API key for display
  private maskKey(key: string): string {
    if (key.length <= 8) return '****';
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  // Get recent usage logs for an API key
  async getRecentLogs(id: string, userId: string, limit: number = 50) {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, created_by: { id: userId } },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const logs = await this.usageLogRepository.find({
      where: { api_key: { id: apiKey.id } },
      order: { logged_at: 'DESC' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      endpoint: log.endpoint,
      method: log.method,
      status_code: log.status_code,
      ip_address: log.ip_address,
      response_time_ms: log.response_time_ms,
      error_message: log.error_message,
      logged_at: log.logged_at,
    }));
  }

  // Rollover an expired API key
  async rollover(dto: RolloverApiKeyDto, userId: string) {
    // Find the expired key
    const expiredKey = await this.apiKeyRepository.findOne({
      where: { id: dto.expired_key_id, created_by: { id: userId } },
    });

    if (!expiredKey) {
      throw new NotFoundException('API key not found');
    }

    // Verify that the key is actually expired
    if (!expiredKey.isExpired()) {
      throw new BadRequestException(
        'API key must be expired to rollover. Current key is still valid.',
      );
    }

    // Check maximum 5 active keys per user (before creating new one)
    const activeKeysCount = await this.apiKeyRepository.count({
      where: {
        created_by: { id: userId },
        is_active: true,
      },
    });

    if (activeKeysCount >= 5) {
      throw new BadRequestException(
        'Maximum 5 active API keys allowed per user. Please deactivate an existing key first.',
      );
    }

    // Generate new key with same permissions
    const newKey = this.generateApiKey();
    const expiresAt = this.calculateExpiryDate(dto.expiry);

    const apiKey = new ApiKey();
    apiKey.key = newKey;
    apiKey.name = expiredKey.name; // Reuse same name
    apiKey.description = expiredKey.description;
    apiKey.created_by = { id: userId } as any;
    apiKey.permissions = expiredKey.permissions; // Reuse same permissions
    apiKey.rate_limit_per_hour = expiredKey.rate_limit_per_hour;
    apiKey.rate_limit_per_day = expiredKey.rate_limit_per_day;
    apiKey.expires_at = expiresAt; // New expiry date
    apiKey.ip_whitelist = expiredKey.ip_whitelist;
    apiKey.is_active = true;

    const saved = await this.apiKeyRepository.save(apiKey);

    return {
      api_key: saved.key, // Only shown once at creation
      expires_at: saved.expires_at,
      permissions: saved.permissions, // Show inherited permissions
      rollover_from: expiredKey.id, // Reference to old key
    };
  }
}
