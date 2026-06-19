import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MEDIA_ADAPTERS, createConfiguredMediaAdaptersAsync } from './media.adapters';
import { MediaWorkerService } from './media-worker.service';

@Module({
  providers: [
    {
      provide: MEDIA_ADAPTERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createConfiguredMediaAdaptersAsync(config),
    },
    MediaWorkerService,
  ],
  exports: [MEDIA_ADAPTERS, MediaWorkerService],
})
export class MediaModule {}
