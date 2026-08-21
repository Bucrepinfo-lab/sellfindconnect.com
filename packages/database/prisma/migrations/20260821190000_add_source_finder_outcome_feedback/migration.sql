CREATE TABLE "SourceFinderOutcomeFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceRecordId" VARCHAR(120) NOT NULL,
    "query" VARCHAR(200),
    "action" VARCHAR(40) NOT NULL,
    "note" VARCHAR(500),
    "behavioralMatchingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceFinderOutcomeFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SourceFinderOutcomeFeedback_tenantId_sourceRecordId_idx" ON "SourceFinderOutcomeFeedback"("tenantId", "sourceRecordId");
CREATE INDEX "SourceFinderOutcomeFeedback_tenantId_createdAt_idx" ON "SourceFinderOutcomeFeedback"("tenantId", "createdAt");

ALTER TABLE "SourceFinderOutcomeFeedback" ADD CONSTRAINT "SourceFinderOutcomeFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
