import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AfricasTalkingSmsSender, SMS_SENDER } from './africastalking-sms';
import { AuthController } from './auth.controller';
import { AUTH_REPOSITORY } from './auth.repository';
import { AuthService } from './auth.service';
import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { EMAIL_SENDER, createAuthEmailSender } from './resend-email';

@Module({
  controllers: [AuthController],
  providers: [
    InMemoryAuthRepository,
    { provide: SMS_SENDER, useClass: AfricasTalkingSmsSender },
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createAuthEmailSender({
          AUTH_EMAIL_PROVIDER: config.get<string>('AUTH_EMAIL_PROVIDER'),
          RESEND_API_KEY: config.get<string>('RESEND_API_KEY'),
          EMAIL_FROM: config.get<string>('EMAIL_FROM'),
          WEB_URL: config.get<string>('WEB_URL'),
          WEB_ORIGIN: config.get<string>('WEB_ORIGIN'),
          APP_URL: config.get<string>('APP_URL'),
        }),
    },
    {
      provide: AUTH_REPOSITORY,
      inject: [ConfigService, InMemoryAuthRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryAuthRepository) => {
        const repositoryMode = (config.get<string>('AUTH_REPOSITORY') ?? 'memory').toLowerCase();
        const usePrisma = ['prisma', 'postgres', 'database'].includes(repositoryMode);

        if (!usePrisma) {
          return inMemory;
        }

        const databaseUrl = config.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when AUTH_REPOSITORY=prisma.');
        }

        const { PrismaAuthRepository, createAuthPrismaClient } = await import('./prisma-auth.repository.js');
        return new PrismaAuthRepository(createAuthPrismaClient(databaseUrl));
      },
    },
    AuthService,
  ],
  exports: [AUTH_REPOSITORY, AuthService],
})
export class AuthModule {}
