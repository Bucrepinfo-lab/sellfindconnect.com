import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccessModule } from '../access/access.module';
import { AuthModule } from '../auth/auth.module';
import { InMemoryRelationshipsRepository } from './in-memory-relationships.repository';
import { RelationshipModerationController } from './relationship-moderation.controller';
import { RelationshipsController } from './relationships.controller';
import { RELATIONSHIPS_REPOSITORY } from './relationships.repository';
import { RelationshipsService } from './relationships.service';

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [RelationshipsController, RelationshipModerationController],
  providers: [
    InMemoryRelationshipsRepository,
    {
      provide: RELATIONSHIPS_REPOSITORY,
      inject: [ConfigService, InMemoryRelationshipsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryRelationshipsRepository) => {
        const repositoryMode = (
          config.get<string>('RELATIONSHIPS_REPOSITORY') ??
          config.get<string>('ADVERT_REPOSITORY') ??
          config.get<string>('ADVERTS_REPOSITORY') ??
          config.get<string>('AUTH_REPOSITORY') ??
          'memory'
        ).toLowerCase();
        const usePrisma = ['prisma', 'postgres', 'database'].includes(repositoryMode);

        if (!usePrisma) {
          return inMemory;
        }

        const databaseUrl = config.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when RELATIONSHIPS_REPOSITORY=prisma.');
        }

        const { PrismaRelationshipsRepository, createRelationshipsPrismaClient } = await import(
          './prisma-relationships.repository.js'
        );
        return new PrismaRelationshipsRepository(createRelationshipsPrismaClient(databaseUrl));
      },
    },
    RelationshipsService,
  ],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
