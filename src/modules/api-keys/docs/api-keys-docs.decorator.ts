import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SYS_MESSAGES } from '../../../common/constants/sys-messages';

export const ApiApiKeysTags = () => applyDecorators(ApiTags('API Keys'));

export const ApiApiKeysBearerAuth = () => applyDecorators(ApiBearerAuth());

export const ApiCreateApiKey = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create API Key',
      description:
        'Creates a new API key with specified permissions and expiry. ' +
        'Rules:\n' +
        '• expiry accepts only: 1H, 1D, 1M, 1Y (Hour, Day, Month, Year)\n' +
        '• Backend converts expiry into real datetime and stores as expires_at\n' +
        '• Maximum 5 active keys per user\n' +
        '• Permissions must be explicitly assigned (e.g., deposit, transfer, read)',
    }),
    ApiResponse({
      status: 201,
      description: 'API key created successfully',
      schema: {
        type: 'object',
        example: {
          api_key: 'sk_live_xxxxx',
          expires_at: '2025-01-01T12:00:00Z',
        },
        properties: {
          api_key: {
            type: 'string',
            description: 'Generated API key (shown only once)',
          },
          expires_at: {
            type: 'string',
            format: 'date-time',
            description: 'Expiration date and time in ISO 8601 format',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid input or maximum keys reached',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            oneOf: [
              {
                type: 'string',
                example: 'Maximum 5 active API keys allowed per user',
              },
              {
                type: 'array',
                items: { type: 'string' },
                example: [
                  'expiry must be one of the following values: 1H, 1D, 1M, 1Y',
                ],
              },
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );

export const ApiRolloverApiKey = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Rollover Expired API Key',
      description:
        'Create a new API key using the same permissions as an expired key. ' +
        'Rules:\n' +
        '• The expired key must truly be expired\n' +
        '• The new key reuses the same permissions\n' +
        '• expiry must again be converted to a new expires_at value\n' +
        '• Accepts: 1H, 1D, 1M, 1Y (Hour, Day, Month, Year)',
    }),
    ApiResponse({
      status: 201,
      description: 'API key rolled over successfully',
      schema: {
        type: 'object',
        example: {
          api_key: 'sk_live_xxxxx',
          expires_at: '2026-01-10T12:00:00Z',
        },
        properties: {
          api_key: {
            type: 'string',
            description: 'New generated API key',
          },
          expires_at: {
            type: 'string',
            format: 'date-time',
            description: 'New expiration date and time in ISO 8601 format',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Key is not expired or invalid expiry format',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'API key is still active and cannot be rolled over',
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found - Expired key not found',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: {
            type: 'string',
            example: 'API key not found',
          },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );

export const ApiGetAllApiKeys = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get All API Keys',
      description:
        'Retrieves all API keys belonging to the authenticated user. ' +
        'Returns both active and expired keys with their metadata.',
    }),
    ApiResponse({
      status: 200,
      description: 'API keys retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'Production API Key' },
                key_prefix: { type: 'string', example: 'sk_live_a1b2****' },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['read', 'deposit'],
                },
                is_active: { type: 'boolean', example: true },
                expires_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-12-10T12:00:00Z',
                },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-12-10T12:00:00Z',
                },
                last_used_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-12-09T15:30:00Z',
                  nullable: true,
                },
              },
            },
          },
          total: { type: 'number', example: 3 },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: SYS_MESSAGES.UNAUTHORIZED,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: SYS_MESSAGES.UNAUTHORIZED },
        },
      },
    }),
  );

export const ApiGetApiKeyById = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get API Key by ID',
      description:
        'Retrieves detailed information about a specific API key by its ID. ' +
        'Includes usage statistics and configuration details.',
    }),
    ApiParam({
      name: 'id',
      description: 'API Key ID (UUID)',
      example: '550e8400-e29b-41d4-a716-446655440000',
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'API key retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Production API Key' },
          key_prefix: { type: 'string', example: 'sk_live_a1b2****' },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            example: ['read', 'deposit', 'transfer'],
          },
          rate_limit: { type: 'number', example: 1000 },
          ip_whitelist: {
            type: 'array',
            items: { type: 'string' },
            example: ['192.168.1.1', '10.0.0.1'],
            nullable: true,
          },
          is_active: { type: 'boolean', example: true },
          expires_at: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-10T12:00:00Z',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            example: '2024-12-10T12:00:00Z',
          },
          last_used_at: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-09T15:30:00Z',
            nullable: true,
          },
          usage_count: { type: 'number', example: 15234 },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: SYS_MESSAGES.API_KEY_NOT_FOUND,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: SYS_MESSAGES.API_KEY_NOT_FOUND },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: SYS_MESSAGES.UNAUTHORIZED,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: SYS_MESSAGES.UNAUTHORIZED },
        },
      },
    }),
  );

export const ApiUpdateApiKey = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update API Key',
      description:
        'Updates an existing API key configuration. ' +
        'Can modify name, permissions, rate limits, IP whitelist, and active status. ' +
        'Cannot update the actual key value.',
    }),
    ApiParam({
      name: 'id',
      description: 'API Key ID (UUID)',
      example: '550e8400-e29b-41d4-a716-446655440000',
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: SYS_MESSAGES.API_KEY_UPDATED,
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: SYS_MESSAGES.API_KEY_UPDATED },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid permissions or rate limits',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: ['permissions must be an array'],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: SYS_MESSAGES.API_KEY_NOT_FOUND,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: SYS_MESSAGES.API_KEY_NOT_FOUND },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: SYS_MESSAGES.UNAUTHORIZED,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: SYS_MESSAGES.UNAUTHORIZED },
        },
      },
    }),
  );

export const ApiDeleteApiKey = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete API Key',
      description:
        'Permanently deletes an API key. ' +
        'This action cannot be undone. ' +
        'The key will be immediately revoked and unusable.',
    }),
    ApiParam({
      name: 'id',
      description: 'API Key ID (UUID)',
      example: '550e8400-e29b-41d4-a716-446655440000',
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: SYS_MESSAGES.API_KEY_DELETED,
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: SYS_MESSAGES.API_KEY_DELETED },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: SYS_MESSAGES.API_KEY_NOT_FOUND,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: SYS_MESSAGES.API_KEY_NOT_FOUND },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: SYS_MESSAGES.UNAUTHORIZED,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: SYS_MESSAGES.UNAUTHORIZED },
        },
      },
    }),
  );

export const ApiGetApiKeyStats = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get API Key Usage Statistics',
      description:
        'Retrieves usage statistics for a specific API key over a given time period. ' +
        'Includes request counts, error rates, and usage patterns. ' +
        'Useful for monitoring and rate limiting analysis.',
    }),
    ApiParam({
      name: 'id',
      description: 'API Key ID (UUID)',
      example: '550e8400-e29b-41d4-a716-446655440000',
      type: String,
    }),
    ApiQuery({
      name: 'days',
      required: false,
      description: 'Number of days to retrieve statistics for (default: 30)',
      example: 7,
      type: Number,
    }),
    ApiResponse({
      status: 200,
      description: SYS_MESSAGES.API_KEY_STATS_RETRIEVED,
      schema: {
        type: 'object',
        properties: {
          total_requests: { type: 'number', example: 15234 },
          successful_requests: { type: 'number', example: 14890 },
          failed_requests: { type: 'number', example: 344 },
          error_rate: { type: 'number', example: 2.26 },
          daily_usage: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', example: '2025-12-09' },
                requests: { type: 'number', example: 523 },
              },
            },
          },
          top_endpoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                endpoint: { type: 'string', example: '/wallet/balance' },
                count: { type: 'number', example: 8945 },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: SYS_MESSAGES.API_KEY_NOT_FOUND,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: SYS_MESSAGES.API_KEY_NOT_FOUND },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: SYS_MESSAGES.UNAUTHORIZED,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: SYS_MESSAGES.UNAUTHORIZED },
        },
      },
    }),
  );

export const ApiGetApiKeyLogs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get API Key Request Logs',
      description:
        'Retrieves recent request logs for a specific API key. ' +
        'Includes timestamps, endpoints accessed, response codes, and IP addresses. ' +
        'Useful for debugging and security auditing.',
    }),
    ApiParam({
      name: 'id',
      description: 'API Key ID (UUID)',
      example: '550e8400-e29b-41d4-a716-446655440000',
      type: String,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Number of logs to retrieve (default: 100, max: 1000)',
      example: 50,
      type: Number,
    }),
    ApiResponse({
      status: 200,
      description: SYS_MESSAGES.API_KEY_LOGS_RETRIEVED,
      schema: {
        type: 'object',
        properties: {
          logs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-12-09T15:30:45Z',
                },
                endpoint: { type: 'string', example: '/wallet/deposit' },
                method: { type: 'string', example: 'POST' },
                status_code: { type: 'number', example: 200 },
                ip_address: { type: 'string', example: '192.168.1.1' },
                response_time_ms: { type: 'number', example: 245 },
              },
            },
          },
          total: { type: 'number', example: 15234 },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: SYS_MESSAGES.API_KEY_NOT_FOUND,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: SYS_MESSAGES.API_KEY_NOT_FOUND },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: SYS_MESSAGES.UNAUTHORIZED,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: SYS_MESSAGES.UNAUTHORIZED },
        },
      },
    }),
  );
