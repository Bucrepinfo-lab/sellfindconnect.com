import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AdvertsController } from './adverts.controller';
import { AdvertsService } from './adverts.service';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [AdvertsController],
  providers: [AdvertsService],
  exports: [AdvertsService],
})
export class AdvertsModule {}
