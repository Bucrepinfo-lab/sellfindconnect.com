-- Migration: 20260625000000_finance_durability
CREATE TABLE "FinanceIdempotency" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  TEXT NOT NULL,
  "scope"     VARCHAR(80) NOT NULL,
  "key"       TEXT NOT NULL,
  "resultId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceIdempotency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinanceIdempotency_tenantId_scope_key_key" ON "FinanceIdempotency"("tenantId", "scope", "key");
CREATE INDEX "FinanceIdempotency_tenantId_idx" ON "FinanceIdempotency"("tenantId");

CREATE TABLE "FinanceSequence" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
  "countryId" VARCHAR(2) NOT NULL,
  "kind"      VARCHAR(20) NOT NULL,
  "year"      INTEGER NOT NULL,
  "value"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "FinanceSequence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinanceSequence_countryId_kind_year_key" ON "FinanceSequence"("countryId", "kind", "year");

CREATE TABLE "FinancePeriodLock" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  TEXT NOT NULL,
  "countryId" VARCHAR(2) NOT NULL,
  "period"    VARCHAR(7) NOT NULL,
  "lockedAt"  TIMESTAMP(3) NOT NULL,
  "lockedBy"  TEXT NOT NULL,
  CONSTRAINT "FinancePeriodLock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinancePeriodLock_tenantId_countryId_period_key" ON "FinancePeriodLock"("tenantId", "countryId", "period");
CREATE INDEX "FinancePeriodLock_tenantId_idx" ON "FinancePeriodLock"("tenantId");

CREATE TABLE "FinanceReturnApproval" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"    TEXT NOT NULL,
  "countryId"   VARCHAR(2) NOT NULL,
  "period"      VARCHAR(7) NOT NULL,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL,
  "decidedBy"   TEXT,
  "decidedAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceReturnApproval_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinanceReturnApproval_tenantId_countryId_period_key" ON "FinanceReturnApproval"("tenantId", "countryId", "period");

CREATE TABLE "CountryPricing" (
  "country"     VARCHAR(2) NOT NULL,
  "currency"    VARCHAR(3) NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "display"     VARCHAR(40) NOT NULL,
  "mode"        VARCHAR(10) NOT NULL,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CountryPricing_pkey" PRIMARY KEY ("country")
);

ALTER TABLE "FinanceAlert" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceAlert_dedupeKey_key" ON "FinanceAlert"("dedupeKey") WHERE "dedupeKey" IS NOT NULL;

ALTER TABLE "CreditNote" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "CreditNote" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Refund" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "Refund" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Chargeback" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

ALTER TABLE "ReconciliationRun" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ReconciliationRun" ADD COLUMN IF NOT EXISTS "variances" JSONB;
ALTER TABLE "ReconciliationRun" ADD COLUMN IF NOT EXISTS "matchedCount" INTEGER NOT NULL DEFAULT 0;
