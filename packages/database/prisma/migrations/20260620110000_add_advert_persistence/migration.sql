CREATE TABLE "AdvertDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "industryCode" VARCHAR(80) NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "phone" VARCHAR(80),
    "email" VARCHAR(320),
    "website" VARCHAR(500),
    "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvertDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublishedAdvert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceDraftId" TEXT,
    "countryCode" VARCHAR(2) NOT NULL,
    "industryCode" VARCHAR(80) NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "phone" VARCHAR(80),
    "email" VARCHAR(320),
    "website" VARCHAR(500),
    "status" VARCHAR(40) NOT NULL DEFAULT 'LIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "renewalAlertsSent" JSONB,
    "pausedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedAdvert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdvertLifecycleNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "advertId" VARCHAR(120) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "day" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvertLifecycleNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdvertDraft_tenantId_status_idx" ON "AdvertDraft"("tenantId", "status");
CREATE INDEX "AdvertDraft_countryCode_industryCode_idx" ON "AdvertDraft"("countryCode", "industryCode");

CREATE INDEX "PublishedAdvert_tenantId_status_idx" ON "PublishedAdvert"("tenantId", "status");
CREATE INDEX "PublishedAdvert_sourceDraftId_idx" ON "PublishedAdvert"("sourceDraftId");
CREATE INDEX "PublishedAdvert_status_expiresAt_idx" ON "PublishedAdvert"("status", "expiresAt");
CREATE INDEX "PublishedAdvert_countryCode_industryCode_idx" ON "PublishedAdvert"("countryCode", "industryCode");

CREATE UNIQUE INDEX "AdvertLifecycleNotification_advertId_day_key" ON "AdvertLifecycleNotification"("advertId", "day");
CREATE INDEX "AdvertLifecycleNotification_tenantId_scheduledFor_idx" ON "AdvertLifecycleNotification"("tenantId", "scheduledFor");

ALTER TABLE "AdvertDraft" ADD CONSTRAINT "AdvertDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvertDraft" ADD CONSTRAINT "AdvertDraft_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PublishedAdvert" ADD CONSTRAINT "PublishedAdvert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishedAdvert" ADD CONSTRAINT "PublishedAdvert_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdvertLifecycleNotification" ADD CONSTRAINT "AdvertLifecycleNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
