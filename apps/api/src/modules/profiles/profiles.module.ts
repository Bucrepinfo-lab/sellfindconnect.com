import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
        const repositoryMode = (
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
          throw new Error('DATABASE_URL is required when PROFILE_REPOSITORY=prisma.');
        }

        const { PrismaProfilesRepository, createProfilesPrismaClient } = await import(
          './prisma-profiles.repository.js'
        );
        return new PrismaProfilesRepository(createProfilesPrismaClient(databaseUrl));
      },
    },
    ProfilesService,
  ],
})
export class ProfilesModule {}
