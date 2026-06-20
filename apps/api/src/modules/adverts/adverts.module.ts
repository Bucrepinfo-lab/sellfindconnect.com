import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AdvertsController, PublicAdvertsController } from './adverts.controller';
import { ADVERTS_REPOSITORY } from './adverts.repository';
import { AdvertsService } from './adverts.service';
import { InMemoryAdvertsRepository } from './in-memory-adverts.repository';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [AdvertsController, PublicAdvertsController],
  providers: [
    InMemoryAdvertsRepository,
    {
      provide: ADVERTS_REPOSITORY,
      inject: [ConfigService, InMemoryAdvertsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryAdvertsRepository) => {
        const repositoryMode = (
          config.get<string>('ADVERTS_REPOSITORY') ??
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
          throw new Error('DATABASE_URL is required when ADVERTS_REPOSITORY=prisma.');
        }

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
