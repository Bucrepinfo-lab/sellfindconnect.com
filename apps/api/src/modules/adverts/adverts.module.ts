import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import {
  MEDIA_ADAPTERS,
  createConfiguredMediaAdapters,
} from '../media/media.adapters';
import { AdvertsController } from './adverts.controller';
import { AdvertsService } from './adverts.service';

@Module({
  imports: [AuthModule],
  controllers: [AdvertsController],
  providers: [
    {
      provide: MEDIA_ADAPTERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createConfiguredMediaAdapters(config),
    },
    AdvertsService,
  ],
  exports: [AdvertsService],
})
export class AdvertsModule {}
