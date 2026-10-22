CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "AdvertDiscoveryIndex" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;
ALTER TABLE "AdvertDiscoveryIndex" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

UPDATE "AdvertDiscoveryIndex" SET "searchVector" = to_tsvector(
  'english',
  coalesce("title", '') || ' ' ||
  coalesce("displayName", '') || ' ' ||
  coalesce("description", '') || ' ' ||
  coalesce("industryCode", '') || ' ' ||
  coalesce("role", '')
);

CREATE INDEX IF NOT EXISTS "AdvertDiscoveryIndex_searchVector_idx" ON "AdvertDiscoveryIndex" USING GIN("searchVector");
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "AdvertDiscoveryIndex" LIMIT 1) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "AdvertDiscoveryIndex_embedding_idx" ON "AdvertDiscoveryIndex" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 1)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "AdvertDiscoveryIndex_title_trgm_idx" ON "AdvertDiscoveryIndex" USING GIN("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "AdvertDiscoveryIndex_displayName_trgm_idx" ON "AdvertDiscoveryIndex" USING GIN("displayName" gin_trgm_ops);

CREATE OR REPLACE FUNCTION update_advert_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector(
    'english',
    coalesce(NEW."title", '') || ' ' ||
    coalesce(NEW."displayName", '') || ' ' ||
    coalesce(NEW."description", '') || ' ' ||
    coalesce(NEW."industryCode", '') || ' ' ||
    coalesce(NEW."role", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS advert_search_vector_trigger ON "AdvertDiscoveryIndex";
CREATE TRIGGER advert_search_vector_trigger BEFORE INSERT OR UPDATE ON "AdvertDiscoveryIndex" FOR EACH ROW EXECUTE FUNCTION update_advert_search_vector();

ALTER TABLE "SavedAdvertSearch" ADD COLUMN IF NOT EXISTS "queryVector" tsvector;
UPDATE "SavedAdvertSearch" SET "queryVector" = to_tsvector('english', coalesce("query", ''));
CREATE INDEX IF NOT EXISTS "SavedAdvertSearch_queryVector_idx" ON "SavedAdvertSearch" USING GIN("queryVector");
