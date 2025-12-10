import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { PaystackApiService } from './common/services/paystack-api.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: configService.get<string>('NODE_ENV') !== 'production',
            ssl: {
              rejectUnauthorized: false, // Required for Heroku Postgres
            },
          };
        }

        // Fallback to individual parameters for local development
        return {
          type: 'postgres',
          host: configService.get<string>('DATABASE_HOST'),
          port: configService.get<number>('DATABASE_PORT'),
          username: configService.get<string>('DATABASE_USER'),
          password: String(
            configService.get<string>('DATABASE_PASSWORD') || 'postgres',
          ),
          database: configService.get<string>('DATABASE_NAME'),
          autoLoadEntities: true,
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),
    UsersModule,
    AuthModule,
    WalletModule,
    ApiKeysModule,
  ],
  controllers: [AppController],
  providers: [AppService, PaystackApiService],
})
export class AppModule {}
