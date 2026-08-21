import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { FinanceController } from './finance.controller';
import { FINANCE_REPOSITORY, type FinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';
import { InMemoryFinanceRepository } from './in-memory-finance.repository';

@Module({
  imports: [AuthModule],
  providers: [
    InMemoryFinanceRepository,
    {
      provide: FINANCE_REPOSITORY,
      inject: [ConfigService, InMemoryFinanceRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryFinanceRepository) => {
        const repositoryMode = (
          config.get<string>('FINANCE_REPOSITORY') ??
          config.get<string>('AUTH_REPOSITORY') ??
          'memory'
        ).toLowerCase();
        const usePrisma = ['prisma', 'postgres', 'database'].includes(repositoryMode);

        if (!usePrisma) {
          return inMemory;
        }

        const databaseUrl = config.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when FINANCE_REPOSITORY=prisma.');
        }

        const { PrismaFinanceRepository, createFinancePrismaClient } = await import(
          './prisma-finance.repository.js'
        );
        return new PrismaFinanceRepository(createFinancePrismaClient(databaseUrl));
      },
    },
    {
      provide: FinanceService,
      inject: [AuthService, FINANCE_REPOSITORY],
      useFactory: (auth: AuthService, repository: FinanceRepository) =>
        new FinanceService(undefined, auth, repository),
    },
  ],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
