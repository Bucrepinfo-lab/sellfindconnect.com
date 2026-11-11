-- Ratings and reviews of a business by another signed-in business
-- (owner-approved 11/11/26). One review per reviewing business per business;
-- moderators hide reviews (status HIDDEN) rather than delete them.
-- Additive only: one new table; no change to existing tables.

CREATE TABLE IF NOT EXISTS "BusinessReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewerTenantId" VARCHAR(120) NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(600),
    "status" VARCHAR(20) NOT NULL,
    "hiddenReason" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusinessReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessReview_tenantId_reviewerTenantId_key" ON "BusinessReview"("tenantId", "reviewerTenantId");
CREATE INDEX IF NOT EXISTS "BusinessReview_tenantId_status_updatedAt_idx" ON "BusinessReview"("tenantId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "BusinessReview_status_updatedAt_idx" ON "BusinessReview"("status", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessReview_tenantId_fkey') THEN
    ALTER TABLE "BusinessReview" ADD CONSTRAINT "BusinessReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
