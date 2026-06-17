import { Module } from '@nestjs/common';

import { SourceFinderController } from './source-finder.controller';
import { SourceFinderService } from './source-finder.service';

@Module({
  controllers: [SourceFinderController],
  providers: [SourceFinderService],
})
export class SourceFinderModule {}
