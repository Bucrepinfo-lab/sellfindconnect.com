import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
import { AccessModule } from '../access/access.module';
import { AuthModule } from '../auth/auth.module';
import { InMemoryUgcRepository } from './in-memory-ugc.repository';
import { UgcModerationController } from './ugc-moderation.controller';
import { UgcController } from './ugc.controller';
import { UGC_REPOSITORY } from './ugc.repository';
import { UgcService } from './ugc.service';

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [UgcController, UgcModerationController],
  providers: [
    InMemoryUgcRepository,
    {
      provide: UGC_REPOSITORY,
      inject: [ConfigService, InMemoryUgcRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryUgcRepository) => {
        if (resolvePersistenceMode(config, ['UGC_REPOSITORY', 'AUTH_REPOSITORY']) === 'memory') {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'UGC_REPOSITORY');
        const { PrismaUgcRepository, createUgcPrismaClient } = await import(
          './prisma-ugc.repository.js'
        );
        return new PrismaUgcRepository(createUgcPrismaClient(databaseUrl));
      },
    },
    UgcService,
  ],
  exports: [UgcService],
})
export class UgcModule {}
