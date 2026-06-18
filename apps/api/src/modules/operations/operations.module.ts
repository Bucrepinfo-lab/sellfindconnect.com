import { Module } from '@nestjs/common';

import { AdvertsModule } from '../adverts/adverts.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { InternalJobGuard } from './internal-job.guard';
import { OperationsController } from './operations.controller';

@Module({
  imports: [AdvertsModule, ConversationsModule],
  controllers: [OperationsController],
  providers: [InternalJobGuard],
})
export class OperationsModule {}
