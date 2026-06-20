import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccessModule } from '../access/access.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController, PlatformAnalyticsController } from './analytics.controller';
import { ANALYTICS_REPOSITORY } from './analytics.repository';
import { AnalyticsService } from './analytics.service';
import { InMemoryAnalyticsRepository } from './in-memory-analytics.repository';

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [AnalyticsController, PlatformAnalyticsController],
  providers: [
    InMemoryAnalyticsRepository,
    {
      provide: ANALYTICS_REPOSITORY,
      inject: [ConfigService, InMemoryAnalyticsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryAnalyticsRepository) => {
        const repositoryMode = (
          config.get<string>('ANALYTICS_REPOSITORY') ??
          config.get<string>('ADVERTS_REPOSITORY') ??
          config.get<string>('PROFILE_REPOSITORY') ??
          config.get<string>('AUTH_REPOSITORY') ??
          'memory'
        ).toLowerCase();
        const usePrisma = ['prisma', 'postgres', 'database'].includes(repositoryMode);

        if (!usePrisma) {
          return inMemory;
        }

        const databaseUrl = config.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when ANALYTICS_REPOSITORY=prisma.');
        }

        const { PrismaAnalyticsRepository, createAnalyticsPrismaClient } =
          await import('./prisma-analytics.repository.js');
        return new PrismaAnalyticsRepository(createAnalyticsPrismaClient(databaseUrl));
      },
    },
    AnalyticsService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
