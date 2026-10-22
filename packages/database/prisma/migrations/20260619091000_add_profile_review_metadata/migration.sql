ALTER TABLE "ProfileDraft" ADD COLUMN "reviewReasons" JSONB;
ALTER TABLE "ProfileDraft" ADD COLUMN "reviewRequestedAt" TIMESTAMP(3);
ALTER TABLE "ProfileDraft" ADD COLUMN "reviewDecision" VARCHAR(40);
ALTER TABLE "ProfileDraft" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "ProfileDraft" ADD COLUMN "reviewedBy" VARCHAR(120);
ALTER TABLE "ProfileDraft" ADD COLUMN "reviewNote" VARCHAR(1000);

CREATE INDEX "ProfileDraft_reviewDecision_idx" ON "ProfileDraft"("reviewDecision");
