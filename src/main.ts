import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Enable global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable global response transformation
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('TR Wallet Service API')
    .setDescription('API documentation for TR Wallet Service')
    .setVersion('1.0')
    .addTag('Authentication', 'Google OAuth and JWT authentication endpoints')
    .addTag('Wallet', 'Wallet management and transactions')
    .addTag('Payments', 'Payment processing with Paystack')
    .addTag('API Keys', 'API key management for service-to-service auth')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'Enter JWT token obtained from the login endpoint. Format: Bearer <token>',
    })
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API key for service-to-service authentication',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Enable CORS if needed
  app.enableCors();

  const port = configService.get<number>('PORT', 3000);
  const env = configService.get<string>('NODE_ENV', 'development');

  await app.listen(port);

  logger.log(
    `
      ------------
      TR Wallet Service Started!
      Environment: ${env}
      API: http://localhost:${port}/
      API Docs: http://localhost:${port}/docs
      ------------
  `,
  );
}
bootstrap();
