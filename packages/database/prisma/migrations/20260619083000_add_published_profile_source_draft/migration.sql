ALTER TABLE "PublishedProfile" ADD COLUMN "sourceDraftId" TEXT;

CREATE INDEX "PublishedProfile_sourceDraftId_idx" ON "PublishedProfile"("sourceDraftId");
