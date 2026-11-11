import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
import { AccessModule } from '../access/access.module';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { InMemoryReviewsRepository } from './in-memory-reviews.repository';
import {
  PublicReviewsController,
  ReviewsController,
  ReviewsModerationController,
} from './reviews.controller';
import { REVIEWS_REPOSITORY } from './reviews.repository';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [AuthModule, AccessModule, ProfilesModule],
  controllers: [ReviewsController, PublicReviewsController, ReviewsModerationController],
  providers: [
    InMemoryReviewsRepository,
    {
      provide: REVIEWS_REPOSITORY,
      inject: [ConfigService, InMemoryReviewsRepository],
      useFactory: async (config: ConfigService, inMemory: InMemoryReviewsRepository) => {
        if (resolvePersistenceMode(config, ['REVIEWS_REPOSITORY', 'AUTH_REPOSITORY']) === 'memory') {
          return inMemory;
        }

        const databaseUrl = requireDatabaseUrl(config, 'REVIEWS_REPOSITORY');
        const { PrismaReviewsRepository, createReviewsPrismaClient } = await import(
          './prisma-reviews.repository.js'
        );
        return new PrismaReviewsRepository(createReviewsPrismaClient(databaseUrl));
      },
    },
    ReviewsService,
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
