import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AUTH_REPOSITORY } from './auth.repository';
import { AuthService } from './auth.service';
import { InMemoryAuthRepository } from './in-memory-auth.repository';

@Module({
  controllers: [AuthController],
  providers: [
    InMemoryAuthRepository,
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
