CREATE TABLE "SourceFinderIndex" (
    "id" TEXT NOT NULL,
    "sourceRecordId" VARCHAR(120) NOT NULL,
    "tenantId" VARCHAR(120),
    "name" VARCHAR(200) NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "industryCode" VARCHAR(80) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "location" VARCHAR(160) NOT NULL,
    "offers" JSONB NOT NULL,
    "needs" JSONB NOT NULL,
    "relatedLinks" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "responseTimeMinutes" INTEGER NOT NULL,
    "analytics" JSONB NOT NULL,
    "searchText" TEXT NOT NULL,
    "tokenVector" JSONB NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceFinderIndex_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SourceFinderIndex_sourceRecordId_key" ON "SourceFinderIndex"("sourceRecordId");

CREATE INDEX "SourceFinderIndex_countryCode_industryCode_role_idx" ON "SourceFinderIndex"("countryCode", "industryCode", "role");

CREATE INDEX "SourceFinderIndex_indexedAt_idx" ON "SourceFinderIndex"("indexedAt");
