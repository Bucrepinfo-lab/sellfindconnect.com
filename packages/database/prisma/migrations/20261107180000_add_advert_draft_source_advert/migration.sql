-- Advert drafts record which live advert they edit (owner-approved 07/11/26),
-- so publishing the edit archives the original in the same call and "Edit"
-- reuses the open draft on any device.
-- Additive only: one nullable column and one index; existing rows stay NULL.

ALTER TABLE "AdvertDraft" ADD COLUMN IF NOT EXISTS "sourceAdvertId" TEXT;

CREATE INDEX IF NOT EXISTS "AdvertDraft_tenantId_sourceAdvertId_idx" ON "AdvertDraft"("tenantId", "sourceAdvertId");
