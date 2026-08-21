import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RelationshipsModule } from '../relationships/relationships.module';
import { SourceFinderController } from './source-finder.controller';
import { SourceFinderService } from './source-finder.service';

@Module({
  imports: [AuthModule, RelationshipsModule],
  controllers: [SourceFinderController],
  providers: [SourceFinderService],
})
export class SourceFinderModule {}
