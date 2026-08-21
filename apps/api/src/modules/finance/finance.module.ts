import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
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
        if (
          resolvePersistenceMode(config, ['FINANCE_REPOSITORY', 'AUTH_REPOSITORY']) === 'memory'
        ) {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'FINANCE_REPOSITORY');

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
