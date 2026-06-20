CREATE TABLE "MediaReviewCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mediaId" VARCHAR(120) NOT NULL,
    "ownerType" VARCHAR(40) NOT NULL,
    "ownerId" VARCHAR(120) NOT NULL,
    "sourceJobId" VARCHAR(120),
    "jobType" VARCHAR(40) NOT NULL,
    "severity" VARCHAR(40) NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'OPEN',
    "reason" VARCHAR(240) NOT NULL,
    "provider" VARCHAR(120),
    "evidence" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" VARCHAR(120),
    "resolution" VARCHAR(120),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaReviewCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaReviewCase_tenantId_status_openedAt_idx" ON "MediaReviewCase"("tenantId", "status", "openedAt");
CREATE INDEX "MediaReviewCase_mediaId_status_idx" ON "MediaReviewCase"("mediaId", "status");
CREATE INDEX "MediaReviewCase_jobType_status_idx" ON "MediaReviewCase"("jobType", "status");
CREATE INDEX "MediaReviewCase_severity_status_idx" ON "MediaReviewCase"("severity", "status");
CREATE INDEX "MediaReviewCase_sourceJobId_idx" ON "MediaReviewCase"("sourceJobId");

ALTER TABLE "MediaReviewCase" ADD CONSTRAINT "MediaReviewCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
