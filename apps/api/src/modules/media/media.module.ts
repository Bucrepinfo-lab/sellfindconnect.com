import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccessModule } from '../access/access.module';
import { AuthModule } from '../auth/auth.module';
import { InMemoryMediaReviewCaseRepository } from './in-memory-media-review-case.repository';
import { MEDIA_ADAPTERS, createConfiguredMediaAdaptersAsync } from './media.adapters';
import { MediaReviewController } from './media-review.controller';
import { MEDIA_REVIEW_CASE_REPOSITORY } from './media-review-case.repository';
import { MediaReviewService } from './media-review.service';
import {
  MEDIA_ASSET_RESULT_PUBLISHER,
  createConfiguredMediaAssetResultPublisherAsync,
} from './media-result-publisher';
import { MediaWorkerService } from './media-worker.service';

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [MediaReviewController],
  providers: [
    InMemoryMediaReviewCaseRepository,
    {
      provide: MEDIA_ADAPTERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createConfiguredMediaAdaptersAsync(config),
    },
    {
      provide: MEDIA_REVIEW_CASE_REPOSITORY,
      inject: [ConfigService, InMemoryMediaReviewCaseRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryMediaReviewCaseRepository) => {
        const repositoryMode = (
          config.get<string>('MEDIA_REVIEW_CASE_REPOSITORY') ??
          config.get<string>('MEDIA_ASSET_RESULT_PUBLISHER_DRIVER') ??
          config.get<string>('MEDIA_JOB_QUEUE_DRIVER') ??
          'memory'
        ).toLowerCase();
        const usePrisma = ['prisma', 'postgres', 'database'].includes(repositoryMode);

        if (!usePrisma) {
          return inMemory;
        }

        const databaseUrl = config.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when MEDIA_REVIEW_CASE_REPOSITORY=prisma.');
        }

        const { PrismaMediaReviewCaseRepository, createMediaReviewCasePrismaClient } =
          await import('./prisma-media-review-case.repository.js');
        return new PrismaMediaReviewCaseRepository(createMediaReviewCasePrismaClient(databaseUrl));
      },
    },
    {
      provide: MEDIA_ASSET_RESULT_PUBLISHER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createConfiguredMediaAssetResultPublisherAsync(config),
    },
    MediaReviewService,
    MediaWorkerService,
  ],
  exports: [
    MEDIA_ADAPTERS,
    MEDIA_ASSET_RESULT_PUBLISHER,
    MEDIA_REVIEW_CASE_REPOSITORY,
    MediaReviewService,
    MediaWorkerService,
  ],
})
export class MediaModule {}
