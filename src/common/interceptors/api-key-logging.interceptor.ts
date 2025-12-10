import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';
import type { ApiKey } from '../../modules/api-keys/entities/api-key.entity';
import type { Request, Response } from 'express';

interface RequestWithApiKey extends Request {
  apiKey?: ApiKey;
}

interface HttpError extends Error {
  status?: number;
}

@Injectable()
export class ApiKeyLoggingInterceptor implements NestInterceptor {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithApiKey>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Only log if API key is used
    const apiKey = request.apiKey;
    if (!apiKey) {
      return next.handle();
    }

    const endpoint = request.url;
    const method = request.method;
    const ipAddress = (request.ip || request.socket?.remoteAddress) as string;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful request
        this.apiKeysService
          .logUsage(
            apiKey,
            endpoint,
            method,
            statusCode,
            ipAddress,
            userAgent,
            responseTime,
          )
          .catch((err: Error) =>
            console.error('Failed to log API key usage:', err),
          );
      }),
      catchError((error: HttpError) => {
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;
        const errorMessage = error.message || 'Unknown error';

        // Log failed request
        this.apiKeysService
          .logUsage(
            apiKey,
            endpoint,
            method,
            statusCode,
            ipAddress,
            userAgent,
            responseTime,
            errorMessage,
          )
          .catch((err: Error) =>
            console.error('Failed to log API key usage:', err),
          );

        return throwError(() => error);
      }),
    );
  }
}
