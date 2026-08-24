import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { LegalController } from './legal.controller';
import { PlatformAnalyticsGuard } from './platform-analytics.guard';
import { PlatformLegalGuard } from './platform-legal.guard';
import { PlatformModerationGuard } from './platform-moderation.guard';

@Module({
  imports: [AuthModule],
  controllers: [AccessController, LegalController],
  providers: [AccessService, PlatformAnalyticsGuard, PlatformModerationGuard, PlatformLegalGuard],
  exports: [PlatformAnalyticsGuard, PlatformModerationGuard, PlatformLegalGuard],
})
export class AccessModule {}
