import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AccessModule } from './access/access.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdvertsModule } from './adverts/adverts.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { ConversationsModule } from './conversations/conversations.module';
import { FinanceModule } from './finance/finance.module';
import { HealthModule } from './health/health.module';
import { LeadsModule } from './leads/leads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OperationsModule } from './operations/operations.module';
import { PaymentsModule } from './payments/payments.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SafetyModule } from './safety/safety.module';
import { SourceFinderModule } from './source-finder/source-finder.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AccessModule,
    AuthModule,
    HealthModule,
    CatalogModule,
    SafetyModule,
    ProfilesModule,
    AnalyticsModule,
    AdvertsModule,
    OperationsModule,
    PaymentsModule,
    FinanceModule,
    SourceFinderModule,
    LeadsModule,
    ConversationsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
