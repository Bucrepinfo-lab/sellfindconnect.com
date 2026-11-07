-- Phone-first sign-in (owner standing rule 07/11/26): SMS one-time codes,
-- a hashed 4-digit PIN with lockout, and revocable trusted devices.
-- Additive only: three new tables, no change to existing columns.

CREATE TABLE IF NOT EXISTS "PhoneCodeChallenge" (
    "id" TEXT NOT NULL,
    "phone" VARCHAR(80) NOT NULL,
    "purpose" VARCHAR(40) NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhoneCodeChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PhoneCodeChallenge_phone_purpose_createdAt_idx" ON "PhoneCodeChallenge"("phone", "purpose", "createdAt");
CREATE INDEX IF NOT EXISTS "PhoneCodeChallenge_expiresAt_idx" ON "PhoneCodeChallenge"("expiresAt");

CREATE TABLE IF NOT EXISTS "UserPin" (
    "userId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pinSalt" VARCHAR(64) NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "setAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPin_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE IF NOT EXISTS "TrustedDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" VARCHAR(120),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrustedDevice_tokenHash_key" ON "TrustedDevice"("tokenHash");
CREATE INDEX IF NOT EXISTS "TrustedDevice_userId_revokedAt_idx" ON "TrustedDevice"("userId", "revokedAt");

DO $$ BEGIN
  ALTER TABLE "UserPin" ADD CONSTRAINT "UserPin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
