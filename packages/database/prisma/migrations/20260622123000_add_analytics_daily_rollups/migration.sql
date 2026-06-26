CREATE TABLE "AnalyticsDailyRollup" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "industryCode" VARCHAR(80) NOT NULL,
    "entityType" "AnalyticsEntityType" NOT NULL,
    "entityId" VARCHAR(120) NOT NULL,
    "consentState" "ConsentState" NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "inquiries" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "chatMessages" INTEGER NOT NULL DEFAULT 0,
    "responseTime" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "lastEventAt" TIMESTAMP(3) NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsDailyRollup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_daily_rollup_unique" ON "AnalyticsDailyRollup"("day", "tenantId", "countryCode", "industryCode", "entityType", "entityId", "consentState");

CREATE INDEX "analytics_daily_rollup_tenant_day_idx" ON "AnalyticsDailyRollup"("tenantId", "day");

CREATE INDEX "analytics_daily_rollup_country_industry_day_idx" ON "AnalyticsDailyRollup"("countryCode", "industryCode", "day");

CREATE INDEX "analytics_daily_rollup_entity_day_idx" ON "AnalyticsDailyRollup"("entityType", "entityId", "day");

ALTER TABLE "AnalyticsDailyRollup" ADD CONSTRAINT "AnalyticsDailyRollup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
