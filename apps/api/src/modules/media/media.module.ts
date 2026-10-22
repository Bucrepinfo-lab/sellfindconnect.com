import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
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
        if (
          resolvePersistenceMode(config, [
            'MEDIA_REVIEW_CASE_REPOSITORY',
            'MEDIA_ASSET_RESULT_PUBLISHER_DRIVER',
            'MEDIA_JOB_QUEUE_DRIVER',
          ]) === 'memory'
        ) {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'MEDIA_REVIEW_CASE_REPOSITORY');

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
