CREATE TABLE "RelationshipClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceLabel" VARCHAR(160) NOT NULL,
    "sourceRole" VARCHAR(80) NOT NULL,
    "counterpartLabel" VARCHAR(160) NOT NULL,
    "counterpartRole" VARCHAR(80) NOT NULL,
    "counterpartTenantId" VARCHAR(120),
    "relationship" VARCHAR(40) NOT NULL,
    "visibility" VARCHAR(40) NOT NULL,
    "status" VARCHAR(40) NOT NULL,
    "note" TEXT,
    "createdByUserId" VARCHAR(120) NOT NULL,
    "decidedByUserId" VARCHAR(120),
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "removedByUserId" VARCHAR(120),
    "removedAt" TIMESTAMP(3),
    "removalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelationshipClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RelationshipClaim_tenantId_status_idx" ON "RelationshipClaim"("tenantId", "status");
CREATE INDEX "RelationshipClaim_counterpartTenantId_status_idx" ON "RelationshipClaim"("counterpartTenantId", "status");
CREATE INDEX "RelationshipClaim_status_visibility_idx" ON "RelationshipClaim"("status", "visibility");

ALTER TABLE "RelationshipClaim" ADD CONSTRAINT "RelationshipClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
