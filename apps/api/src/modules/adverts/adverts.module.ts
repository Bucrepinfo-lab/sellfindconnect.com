import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import {
  MEDIA_ADAPTERS,
  createDefaultMediaAdapters,
} from '../media/media.adapters';
import { AdvertsController } from './adverts.controller';
import { AdvertsService } from './adverts.service';

@Module({
  imports: [AuthModule],
  controllers: [AdvertsController],
  providers: [
    {
      provide: MEDIA_ADAPTERS,
      useFactory: createDefaultMediaAdapters,
    },
    AdvertsService,
  ],
  exports: [AdvertsService],
})
export class AdvertsModule {}
