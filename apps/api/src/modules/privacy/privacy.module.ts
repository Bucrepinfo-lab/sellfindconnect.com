import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
import { AdvertsModule } from '../adverts/adverts.module';
import { AuthModule } from '../auth/auth.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { InMemoryPrivacyRepository } from './in-memory-privacy.repository';
import { PrivacyController } from './privacy.controller';
import { PRIVACY_REPOSITORY } from './privacy.repository';
import { PrivacyService } from './privacy.service';

@Module({
  imports: [AuthModule, AdvertsModule, ProfilesModule, ConversationsModule],
  providers: [
    InMemoryPrivacyRepository,
    {
      provide: PRIVACY_REPOSITORY,
      inject: [ConfigService, InMemoryPrivacyRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryPrivacyRepository) => {
        if (resolvePersistenceMode(config, ['PRIVACY_REPOSITORY', 'AUTH_REPOSITORY']) === 'memory') {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'PRIVACY_REPOSITORY');
        const { PrismaPrivacyRepository, createPrivacyPrismaClient } = await import(
          './prisma-privacy.repository.js'
        );
        return new PrismaPrivacyRepository(createPrivacyPrismaClient(databaseUrl));
      },
    },
    PrivacyService,
  ],
  controllers: [PrivacyController],
  exports: [PrivacyService],
})
export class PrivacyModule {}
