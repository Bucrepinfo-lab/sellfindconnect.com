CREATE TABLE "MediaProcessingJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mediaId" VARCHAR(120) NOT NULL,
    "ownerType" VARCHAR(40) NOT NULL,
    "ownerId" VARCHAR(120) NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'QUEUED',
    "objectKey" VARCHAR(500),
    "sourceUrl" VARCHAR(1000) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" VARCHAR(160),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "metadata" JSONB,
    "result" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaProcessingJob_status_availableAt_idx" ON "MediaProcessingJob"("status", "availableAt");
CREATE INDEX "MediaProcessingJob_tenantId_status_availableAt_idx" ON "MediaProcessingJob"("tenantId", "status", "availableAt");
CREATE INDEX "MediaProcessingJob_type_status_availableAt_idx" ON "MediaProcessingJob"("type", "status", "availableAt");
CREATE INDEX "MediaProcessingJob_mediaId_type_status_idx" ON "MediaProcessingJob"("mediaId", "type", "status");
CREATE INDEX "MediaProcessingJob_lockedBy_status_idx" ON "MediaProcessingJob"("lockedBy", "status");

ALTER TABLE "MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
