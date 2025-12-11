import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import { REQUIRED_PERMISSION_KEY } from '../../../common/decorators';

@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      ip?: string;
      connection?: { remoteAddress?: string };
      apiKey?: unknown;
      apiKeyUser?: unknown;
      user?: unknown;
    }>();

    // Check if API key is present
    const apiKey = request.headers['x-api-key'];
    console.log(
      '🔑 JwtOrApiKeyGuard - API Key:',
      apiKey ? 'Present' : 'Missing',
    );
    console.log('🔑 Headers:', JSON.stringify(request.headers, null, 2));

    if (apiKey && typeof apiKey === 'string') {
      // Try API key authentication
      console.log('🔑 Attempting API key validation...');
      try {
        // Get required permission from decorator (if any)
        const requiredPermission =
          this.reflector.get<string>(
            REQUIRED_PERMISSION_KEY,
            context.getHandler(),
          ) || 'read'; // Default to read permission

        // Get client IP
        const ipAddress = request.ip || request.connection?.remoteAddress;

        // Validate API key with all checks
        const validatedApiKey = await this.apiKeysService.validateApiKey(
          apiKey,
          requiredPermission,
          ipAddress,
        );

        console.log('✅ API key validated successfully');
        // Attach API key and user to request
        request.apiKey = validatedApiKey;
        request.apiKeyUser = validatedApiKey.created_by;
        // Also set request.user for compatibility with @CurrentUser decorator
        request.user = {
          userId: validatedApiKey.created_by.id,
          email: '',
          name: '',
        };

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Invalid API key';
        console.log('❌ API key validation failed:', errorMessage);
        throw new UnauthorizedException(errorMessage);
      }
    }

    // Try JWT authentication
    console.log('🔑 No API key, checking JWT...');
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = await this.jwtService.verifyAsync(token);
        request.user = payload;
        return true;
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired JWT token');
      }
    }

    // No valid authentication provided
    throw new UnauthorizedException(
      'Authentication required: Provide valid JWT token or API key',
    );
  }
}
