-- CreateTable
CREATE TABLE "AuthAccountChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "purpose" VARCHAR(40) NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAccountChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccountChallenge_tokenHash_key" ON "AuthAccountChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthAccountChallenge_userId_purpose_createdAt_idx" ON "AuthAccountChallenge"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAccountChallenge_purpose_expiresAt_idx" ON "AuthAccountChallenge"("purpose", "expiresAt");

-- AddForeignKey
ALTER TABLE "AuthAccountChallenge" ADD CONSTRAINT "AuthAccountChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
