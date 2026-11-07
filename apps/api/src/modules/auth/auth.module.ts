import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
import { AfricasTalkingSmsSender, SMS_SENDER } from './africastalking-sms';
import { AuthController } from './auth.controller';
import { AUTH_REPOSITORY } from './auth.repository';
import { AuthService } from './auth.service';
import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { InMemoryPhoneAuthRepository } from './in-memory-phone-auth.repository';
import { PhoneAuthController } from './phone-auth.controller';
import { PHONE_AUTH_REPOSITORY } from './phone-auth.repository';
import { PhoneAuthService } from './phone-auth.service';
import { EMAIL_SENDER, createAuthEmailSender } from './resend-email';
import {
  HOSTED_IDENTITY_VERIFIER,
  createConfiguredHostedIdentityVerifier,
} from './oidc-identity';

@Module({
  controllers: [AuthController, PhoneAuthController],
  providers: [
    InMemoryAuthRepository,
    InMemoryPhoneAuthRepository,
    {
      provide: PHONE_AUTH_REPOSITORY,
      inject: [ConfigService, InMemoryPhoneAuthRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryPhoneAuthRepository) => {
        if (resolvePersistenceMode(config, ['AUTH_REPOSITORY']) === 'memory') {
          return inMemory;
        }
        const databaseUrl = requireDatabaseUrl(config, 'AUTH_REPOSITORY');
        const { createAuthPrismaClient } = await import('./prisma-auth.repository.js');
        const { PrismaPhoneAuthRepository } = await import('./prisma-phone-auth.repository.js');
        return new PrismaPhoneAuthRepository(createAuthPrismaClient(databaseUrl));
      },
    },
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
      provide: HOSTED_IDENTITY_VERIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createConfiguredHostedIdentityVerifier(config),
    },
    {
      provide: AUTH_REPOSITORY,
      inject: [ConfigService, InMemoryAuthRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryAuthRepository) => {
        if (resolvePersistenceMode(config, ['AUTH_REPOSITORY']) === 'memory') {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'AUTH_REPOSITORY');
        const { PrismaAuthRepository, createAuthPrismaClient } = await import('./prisma-auth.repository.js');
        return new PrismaAuthRepository(createAuthPrismaClient(databaseUrl));
      },
    },
    AuthService,
    PhoneAuthService,
  ],
  exports: [AUTH_REPOSITORY, AuthService, PhoneAuthService],
})
export class AuthModule {}
