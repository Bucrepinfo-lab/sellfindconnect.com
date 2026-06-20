import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { PlatformAnalyticsGuard } from './platform-analytics.guard';
import { PlatformModerationGuard } from './platform-moderation.guard';

@Module({
  imports: [AuthModule],
  controllers: [AccessController],
  providers: [AccessService, PlatformAnalyticsGuard, PlatformModerationGuard],
  exports: [PlatformAnalyticsGuard, PlatformModerationGuard],
})
export class AccessModule {}
