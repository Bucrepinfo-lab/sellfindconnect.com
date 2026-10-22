CREATE TABLE "AdvertDiscoveryIndex" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "advertId" VARCHAR(120) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "industryCode" VARCHAR(80) NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "status" VARCHAR(40) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "tokenVector" JSONB NOT NULL,
    "relationshipSignals" JSONB,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "boostedAt" TIMESTAMP(3),
    "boostExpiresAt" TIMESTAMP(3),
    "boostWeight" INTEGER,
    "indexedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvertDiscoveryIndex_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedAdvertSearch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "query" VARCHAR(240) NOT NULL,
    "countryCode" VARCHAR(2),
    "industryCode" VARCHAR(80),
    "role" VARCHAR(80),
    "alertFrequency" VARCHAR(40) NOT NULL DEFAULT 'DAILY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedAdvertSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdvertDiscoveryAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "savedSearchId" TEXT NOT NULL,
    "advertId" VARCHAR(120) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "rankScore" INTEGER NOT NULL,
    "reasonCodes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvertDiscoveryAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdvertDiscoveryIndex_tenantId_advertId_key" ON "AdvertDiscoveryIndex"("tenantId", "advertId");

CREATE INDEX "AdvertDiscoveryIndex_countryCode_industryCode_role_status_idx" ON "AdvertDiscoveryIndex"("countryCode", "industryCode", "role", "status");

CREATE INDEX "AdvertDiscoveryIndex_status_indexedAt_idx" ON "AdvertDiscoveryIndex"("status", "indexedAt");

CREATE INDEX "AdvertDiscoveryIndex_tenantId_status_indexedAt_idx" ON "AdvertDiscoveryIndex"("tenantId", "status", "indexedAt");

CREATE INDEX "SavedAdvertSearch_tenantId_isActive_idx" ON "SavedAdvertSearch"("tenantId", "isActive");

CREATE INDEX "SavedAdvertSearch_tenantId_updatedAt_idx" ON "SavedAdvertSearch"("tenantId", "updatedAt");

CREATE UNIQUE INDEX "AdvertDiscoveryAlert_savedSearchId_advertId_key" ON "AdvertDiscoveryAlert"("savedSearchId", "advertId");

CREATE INDEX "AdvertDiscoveryAlert_tenantId_createdAt_idx" ON "AdvertDiscoveryAlert"("tenantId", "createdAt");

ALTER TABLE "AdvertDiscoveryIndex" ADD CONSTRAINT "AdvertDiscoveryIndex_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedAdvertSearch" ADD CONSTRAINT "SavedAdvertSearch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdvertDiscoveryAlert" ADD CONSTRAINT "AdvertDiscoveryAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdvertDiscoveryAlert" ADD CONSTRAINT "AdvertDiscoveryAlert_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedAdvertSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
