-- Schema drift fix: these existed in schema.prisma without a migration, so
-- production Prisma queries on "User" failed with ColumnNotFound
-- (User.phoneVerifiedAt, AuthAccountChallenge.phone), breaking sign-in and
-- sign-up. Additive only.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);

ALTER TABLE "AuthAccountChallenge" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(80);

CREATE TABLE IF NOT EXISTS "PaymentTxn" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(40) NOT NULL DEFAULT 'africastalking',
    "kind" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    "providerTxnId" VARCHAR(120),
    "phone" VARCHAR(80) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'KES',
    "reason" VARCHAR(200),
    "userId" TEXT,
    "tenantId" TEXT,
    "metadata" JSONB,
    "rawCallback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentTxn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTxn_providerTxnId_key" ON "PaymentTxn"("providerTxnId");
CREATE INDEX IF NOT EXISTS "PaymentTxn_userId_idx" ON "PaymentTxn"("userId");
CREATE INDEX IF NOT EXISTS "PaymentTxn_status_idx" ON "PaymentTxn"("status");
CREATE INDEX IF NOT EXISTS "PaymentTxn_tenantId_status_idx" ON "PaymentTxn"("tenantId", "status");
