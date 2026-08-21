import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
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
        if (
          resolvePersistenceMode(config, [
            'RELATIONSHIPS_REPOSITORY',
            'ADVERT_REPOSITORY',
            'ADVERTS_REPOSITORY',
            'AUTH_REPOSITORY',
          ]) === 'memory'
        ) {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'RELATIONSHIPS_REPOSITORY');
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
