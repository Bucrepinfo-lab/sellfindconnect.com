import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AnalyticsModule } from './analytics/analytics.module';
import { AdvertsModule } from './adverts/adverts.module';
import { CatalogModule } from './catalog/catalog.module';
import { FinanceModule } from './finance/finance.module';
import { HealthModule } from './health/health.module';
import { LeadsModule } from './leads/leads.module';
import { OperationsModule } from './operations/operations.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SafetyModule } from './safety/safety.module';
import { SourceFinderModule } from './source-finder/source-finder.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    HealthModule,
    CatalogModule,
    SafetyModule,
    ProfilesModule,
    AnalyticsModule,
    AdvertsModule,
    OperationsModule,
    FinanceModule,
    SourceFinderModule,
    LeadsModule,
  ],
})
export class AppModule {}
