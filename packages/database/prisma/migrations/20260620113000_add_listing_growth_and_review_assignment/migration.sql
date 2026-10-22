ALTER TABLE "PublishedAdvert"
ADD COLUMN "boostedAt" TIMESTAMP(3),
ADD COLUMN "boostExpiresAt" TIMESTAMP(3),
ADD COLUMN "boostWeight" INTEGER;

CREATE INDEX "PublishedAdvert_status_boostExpiresAt_idx" ON "PublishedAdvert"("status", "boostExpiresAt");

ALTER TABLE "MediaReviewCase"
ADD COLUMN "assignedTo" VARCHAR(120),
ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "assignmentNote" TEXT;

CREATE INDEX "MediaReviewCase_status_assignedTo_openedAt_idx" ON "MediaReviewCase"("status", "assignedTo", "openedAt");
