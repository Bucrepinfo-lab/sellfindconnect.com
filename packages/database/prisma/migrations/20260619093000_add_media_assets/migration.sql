CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerType" VARCHAR(40) NOT NULL,
    "ownerId" VARCHAR(120) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "status" VARCHAR(40) NOT NULL,
    "sourceUrl" VARCHAR(1000) NOT NULL,
    "thumbnailUrl" VARCHAR(1000),
    "mimeType" VARCHAR(120) NOT NULL,
    "fileName" VARCHAR(240) NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "caption" VARCHAR(500),
    "altText" VARCHAR(500),
    "displayOrder" INTEGER NOT NULL,
    "visibility" VARCHAR(40) NOT NULL,
    "moderationStatus" VARCHAR(40) NOT NULL,
    "moderationReason" VARCHAR(120),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaAsset_tenantId_ownerType_ownerId_displayOrder_idx" ON "MediaAsset"("tenantId", "ownerType", "ownerId", "displayOrder");
CREATE INDEX "MediaAsset_tenantId_status_idx" ON "MediaAsset"("tenantId", "status");
CREATE INDEX "MediaAsset_ownerType_ownerId_idx" ON "MediaAsset"("ownerType", "ownerId");

ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
