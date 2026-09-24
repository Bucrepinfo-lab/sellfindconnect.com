ALTER TABLE "TermsAcceptanceEvidence" ADD COLUMN "communityStandardsVersion" VARCHAR(80);

UPDATE "TermsAcceptanceEvidence"
SET "communityStandardsVersion" = 'community-2026-08-22'
WHERE "termsVersion" = 'terms-2026-08-22'
  AND "communityStandardsVersion" IS NULL;
