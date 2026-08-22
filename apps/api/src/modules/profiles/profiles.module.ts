import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
import { AccessModule } from '../access/access.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { InMemoryProfilesRepository } from './in-memory-profiles.repository';
import { ProfileModerationController } from './profile-moderation.controller';
import { ProfilesController } from './profiles.controller';
import { PROFILES_REPOSITORY } from './profiles.repository';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [AuthModule, AccessModule, MediaModule],
  controllers: [ProfilesController, ProfileModerationController],
  providers: [
    InMemoryProfilesRepository,
    {
      provide: PROFILES_REPOSITORY,
      inject: [ConfigService, InMemoryProfilesRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryProfilesRepository) => {
        if (resolvePersistenceMode(config, ['PROFILE_REPOSITORY', 'AUTH_REPOSITORY']) === 'memory') {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'PROFILE_REPOSITORY');
        const { PrismaProfilesRepository, createProfilesPrismaClient } = await import(
          './prisma-profiles.repository.js'
        );
        return new PrismaProfilesRepository(createProfilesPrismaClient(databaseUrl));
      },
    },
    ProfilesService,
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}
