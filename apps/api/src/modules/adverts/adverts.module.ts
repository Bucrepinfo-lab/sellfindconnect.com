import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AdvertsController, PublicAdvertsController } from './adverts.controller';
import { ADVERTS_REPOSITORY } from './adverts.repository';
import { AdvertsService } from './adverts.service';
import { InMemoryAdvertsRepository } from './in-memory-adverts.repository';

@Module({
  imports: [AuthModule, MediaModule, AnalyticsModule],
  controllers: [AdvertsController, PublicAdvertsController],
  providers: [
    InMemoryAdvertsRepository,
    {
      provide: ADVERTS_REPOSITORY,
      inject: [ConfigService, InMemoryAdvertsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryAdvertsRepository) => {
        if (
          resolvePersistenceMode(config, [
            'ADVERTS_REPOSITORY',
            'PROFILE_REPOSITORY',
            'AUTH_REPOSITORY',
          ]) === 'memory'
        ) {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'ADVERTS_REPOSITORY');
        const { PrismaAdvertsRepository, createAdvertsPrismaClient } =
          await import('./prisma-adverts.repository.js');
        return new PrismaAdvertsRepository(createAdvertsPrismaClient(databaseUrl));
      },
    },
    AdvertsService,
  ],
  exports: [AdvertsService],
})
export class AdvertsModule {}
