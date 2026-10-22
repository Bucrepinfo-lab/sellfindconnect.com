import { Module } from '@nestjs/common';

import { AdvertsModule } from '../adverts/adverts.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { FinanceModule } from '../finance/finance.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { SourceFinderModule } from '../source-finder/source-finder.module';
import { InternalJobGuard } from './internal-job.guard';
import { OperationsController } from './operations.controller';

@Module({
  imports: [
    AdvertsModule,
    AnalyticsModule,
    ConversationsModule,
    FinanceModule,
    MediaModule,
    NotificationsModule,
    PrivacyModule,
    SourceFinderModule,
  ],
  controllers: [OperationsController],
  providers: [InternalJobGuard],
})
export class OperationsModule {}
