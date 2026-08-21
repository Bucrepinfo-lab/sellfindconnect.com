import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RelationshipsModule } from '../relationships/relationships.module';
import { InMemorySourceFinderRepository } from './in-memory-source-finder.repository';
import { SourceFinderController } from './source-finder.controller';
import { SOURCE_FINDER_REPOSITORY } from './source-finder.repository';
import { SourceFinderService } from './source-finder.service';

@Module({
  imports: [AuthModule, RelationshipsModule, NotificationsModule],
  controllers: [SourceFinderController],
  providers: [
    InMemorySourceFinderRepository,
    {
      provide: SOURCE_FINDER_REPOSITORY,
      inject: [ConfigService, InMemorySourceFinderRepository],
      useFactory: async (config: ConfigService, inMemory: InMemorySourceFinderRepository) => {
        const repositoryMode = (
          config.get<string>('SOURCE_FINDER_REPOSITORY') ??
          config.get<string>('ADVERT_REPOSITORY') ??
          config.get<string>('AUTH_REPOSITORY') ??
          'memory'
        ).toLowerCase();
        const usePrisma = ['prisma', 'postgres', 'database'].includes(repositoryMode);

        if (!usePrisma) {
          return inMemory;
        }

        const databaseUrl = config.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when SOURCE_FINDER_REPOSITORY=prisma.');
        }

        const { PrismaSourceFinderRepository, createSourceFinderPrismaClient } = await import(
          './prisma-source-finder.repository.js'
        );
        return new PrismaSourceFinderRepository(createSourceFinderPrismaClient(databaseUrl));
      },
    },
    SourceFinderService,
  ],
  exports: [SourceFinderService],
})
export class SourceFinderModule {}
