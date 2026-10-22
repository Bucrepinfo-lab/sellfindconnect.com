ALTER TABLE "MediaAsset" ADD COLUMN "storageProvider" VARCHAR(80);
ALTER TABLE "MediaAsset" ADD COLUMN "objectKey" VARCHAR(500);
ALTER TABLE "MediaAsset" ADD COLUMN "cdnUrl" VARCHAR(1000);
ALTER TABLE "MediaAsset" ADD COLUMN "transformStatus" VARCHAR(40);
ALTER TABLE "MediaAsset" ADD COLUMN "variants" JSONB;

CREATE INDEX "MediaAsset_storageProvider_objectKey_idx" ON "MediaAsset"("storageProvider", "objectKey");
