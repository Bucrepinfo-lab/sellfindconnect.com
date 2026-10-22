ALTER TABLE "ProfileDraft" ADD COLUMN "whatsapp" VARCHAR(80);
ALTER TABLE "ProfileDraft" ADD COLUMN "physicalAddress" VARCHAR(500);
ALTER TABLE "ProfileDraft" ADD COLUMN "mapsUrl" VARCHAR(500);
ALTER TABLE "ProfileDraft" ADD COLUMN "socialLinks" JSONB;
ALTER TABLE "ProfileDraft" ADD COLUMN "serviceArea" JSONB;

ALTER TABLE "PublishedProfile" ADD COLUMN "whatsapp" VARCHAR(80);
ALTER TABLE "PublishedProfile" ADD COLUMN "physicalAddress" VARCHAR(500);
ALTER TABLE "PublishedProfile" ADD COLUMN "mapsUrl" VARCHAR(500);
ALTER TABLE "PublishedProfile" ADD COLUMN "socialLinks" JSONB;
ALTER TABLE "PublishedProfile" ADD COLUMN "serviceArea" JSONB;
