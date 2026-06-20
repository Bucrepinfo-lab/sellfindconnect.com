import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MEDIA_ADAPTERS, createConfiguredMediaAdaptersAsync } from './media.adapters';
import {
  MEDIA_ASSET_RESULT_PUBLISHER,
  createConfiguredMediaAssetResultPublisherAsync,
} from './media-result-publisher';
import { MediaWorkerService } from './media-worker.service';

@Module({
  providers: [
    {
      provide: MEDIA_ADAPTERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createConfiguredMediaAdaptersAsync(config),
    },
    {
      provide: MEDIA_ASSET_RESULT_PUBLISHER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createConfiguredMediaAssetResultPublisherAsync(config),
    },
    MediaWorkerService,
  ],
  exports: [MEDIA_ADAPTERS, MEDIA_ASSET_RESULT_PUBLISHER, MediaWorkerService],
})
export class MediaModule {}
