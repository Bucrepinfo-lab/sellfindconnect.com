-- CreateTable
CREATE TABLE "AuthMfaChallenge" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "deliveryChannel" VARCHAR(40) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthMfaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthMfaChallenge_sessionId_consumedAt_expiresAt_idx" ON "AuthMfaChallenge"("sessionId", "consumedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthMfaChallenge_userId_createdAt_idx" ON "AuthMfaChallenge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthMfaChallenge_tenantId_createdAt_idx" ON "AuthMfaChallenge"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthMfaChallenge" ADD CONSTRAINT "AuthMfaChallenge_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuthSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthMfaChallenge" ADD CONSTRAINT "AuthMfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthMfaChallenge" ADD CONSTRAINT "AuthMfaChallenge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
