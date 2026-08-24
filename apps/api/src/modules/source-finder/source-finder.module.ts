import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RelationshipsModule } from '../relationships/relationships.module';
import { UgcModule } from '../ugc/ugc.module';
import { InMemorySourceFinderRepository } from './in-memory-source-finder.repository';
import {
  SOURCE_FINDER_EMBEDDER,
  createConfiguredSourceFinderEmbedder,
} from './openai-embeddings';
import { SOURCE_FINDER_REPOSITORY } from './source-finder.repository';
import { SourceFinderController } from './source-finder.controller';
import { SourceFinderService } from './source-finder.service';

@Module({
  imports: [AuthModule, RelationshipsModule, NotificationsModule, UgcModule],
  controllers: [SourceFinderController],
  providers: [
    InMemorySourceFinderRepository,
    {
      provide: SOURCE_FINDER_REPOSITORY,
      inject: [ConfigService, InMemorySourceFinderRepository],
      useFactory: async (config: ConfigService, inMemory: InMemorySourceFinderRepository) => {
        if (
          resolvePersistenceMode(config, [
            'SOURCE_FINDER_REPOSITORY',
            'ADVERT_REPOSITORY',
            'AUTH_REPOSITORY',
          ]) === 'memory'
        ) {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'SOURCE_FINDER_REPOSITORY');

        const { PrismaSourceFinderRepository, createSourceFinderPrismaClient } = await import(
          './prisma-source-finder.repository.js'
        );
        return new PrismaSourceFinderRepository(createSourceFinderPrismaClient(databaseUrl));
      },
    },
    {
      provide: SOURCE_FINDER_EMBEDDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createConfiguredSourceFinderEmbedder(config),
    },
    SourceFinderService,
  ],
  exports: [SourceFinderService],
})
export class SourceFinderModule {}
