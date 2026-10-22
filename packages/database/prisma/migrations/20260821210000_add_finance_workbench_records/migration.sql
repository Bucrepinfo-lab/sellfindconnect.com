-- Durable store for finance workbench records (profiles, snapshots, invoices,
-- tax returns, payments, sequences) so FINANCE_REPOSITORY=prisma can persist
-- the same payload the in-memory repository holds.
CREATE TABLE "FinanceWorkbenchRecord" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "collection"  VARCHAR(40) NOT NULL,
  "recordId"    TEXT NOT NULL,
  "tenantId"    TEXT,
  "countryCode" VARCHAR(2),
  "payload"     JSONB NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceWorkbenchRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceWorkbenchRecord_collection_recordId_key"
  ON "FinanceWorkbenchRecord"("collection", "recordId");
CREATE INDEX "FinanceWorkbenchRecord_collection_tenantId_idx"
  ON "FinanceWorkbenchRecord"("collection", "tenantId");
CREATE INDEX "FinanceWorkbenchRecord_collection_countryCode_idx"
  ON "FinanceWorkbenchRecord"("collection", "countryCode");
