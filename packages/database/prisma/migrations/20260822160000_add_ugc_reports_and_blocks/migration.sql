CREATE TABLE "UserContentReport" (
    "id" TEXT NOT NULL,
    "reporterTenantId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "targetType" VARCHAR(40) NOT NULL,
    "targetId" VARCHAR(120) NOT NULL,
    "targetTenantId" VARCHAR(120),
    "reason" VARCHAR(80) NOT NULL,
    "details" TEXT,
    "status" VARCHAR(40) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserContentReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserContentReport_reporterTenantId_createdAt_idx" ON "UserContentReport"("reporterTenantId", "createdAt");
CREATE INDEX "UserContentReport_status_createdAt_idx" ON "UserContentReport"("status", "createdAt");
CREATE INDEX "UserContentReport_targetType_targetId_idx" ON "UserContentReport"("targetType", "targetId");

ALTER TABLE "UserContentReport" ADD CONSTRAINT "UserContentReport_reporterTenantId_fkey" FOREIGN KEY ("reporterTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "blockedTargetId" VARCHAR(120) NOT NULL,
    "blockedTenantId" VARCHAR(120),
    "createdByUserId" TEXT NOT NULL,
    "reason" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserBlock_tenantId_blockedTargetId_key" ON "UserBlock"("tenantId", "blockedTargetId");
CREATE INDEX "UserBlock_tenantId_idx" ON "UserBlock"("tenantId");

ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
