CREATE TABLE "AccountDeletionRequest" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccountDeletionRequest_tenantId_userId_idx" ON "AccountDeletionRequest"("tenantId","userId");
CREATE INDEX "AccountDeletionRequest_status_scheduledAt_idx" ON "AccountDeletionRequest"("status","scheduledAt");
CREATE TABLE "DataExportRequest" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  "downloadUrl" VARCHAR(1000),
  "expiresAt" TIMESTAMP(3),
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DataExportRequest_tenantId_userId_idx" ON "DataExportRequest"("tenantId","userId");
CREATE INDEX "DataExportRequest_status_expiresAt_idx" ON "DataExportRequest"("status","expiresAt");
