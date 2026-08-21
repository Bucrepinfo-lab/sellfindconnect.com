import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
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
        if (
          resolvePersistenceMode(config, [
            'ANALYTICS_REPOSITORY',
            'ADVERTS_REPOSITORY',
            'PROFILE_REPOSITORY',
            'AUTH_REPOSITORY',
          ]) === 'memory'
        ) {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'ANALYTICS_REPOSITORY');
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
