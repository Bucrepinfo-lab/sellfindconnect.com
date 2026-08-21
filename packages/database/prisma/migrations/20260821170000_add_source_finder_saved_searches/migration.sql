CREATE TABLE "SavedSourceFinderSearch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "query" VARCHAR(200) NOT NULL,
    "role" VARCHAR(80),
    "industryCode" VARCHAR(80),
    "countryCode" VARCHAR(2),
    "sortBy" VARCHAR(40),
    "alertFrequency" VARCHAR(40) NOT NULL DEFAULT 'DAILY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSourceFinderSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceFinderOpportunityAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "savedSearchId" TEXT NOT NULL,
    "sourceRecordId" VARCHAR(120) NOT NULL,
    "sourceName" VARCHAR(200) NOT NULL,
    "sourceRole" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasonCodes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceFinderOpportunityAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SavedSourceFinderSearch_tenantId_isActive_idx" ON "SavedSourceFinderSearch"("tenantId", "isActive");
CREATE INDEX "SavedSourceFinderSearch_tenantId_updatedAt_idx" ON "SavedSourceFinderSearch"("tenantId", "updatedAt");
CREATE UNIQUE INDEX "SourceFinderOpportunityAlert_savedSearchId_sourceRecordId_key" ON "SourceFinderOpportunityAlert"("savedSearchId", "sourceRecordId");
CREATE INDEX "SourceFinderOpportunityAlert_tenantId_createdAt_idx" ON "SourceFinderOpportunityAlert"("tenantId", "createdAt");

ALTER TABLE "SavedSourceFinderSearch" ADD CONSTRAINT "SavedSourceFinderSearch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceFinderOpportunityAlert" ADD CONSTRAINT "SourceFinderOpportunityAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceFinderOpportunityAlert" ADD CONSTRAINT "SourceFinderOpportunityAlert_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSourceFinderSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
