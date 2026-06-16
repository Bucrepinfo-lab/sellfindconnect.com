import { Module } from '@nestjs/common';

import { AdvertsController } from './adverts.controller';
import { AdvertsService } from './adverts.service';

@Module({
  controllers: [AdvertsController],
  providers: [AdvertsService],
  exports: [AdvertsService],
})
export class AdvertsModule {}
