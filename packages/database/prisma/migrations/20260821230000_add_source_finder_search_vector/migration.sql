ALTER TABLE "SourceFinderIndex" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;
ALTER TABLE "SourceFinderIndex" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

UPDATE "SourceFinderIndex"
SET "searchVector" = to_tsvector(
  'english',
  coalesce("searchText", '') || ' ' ||
  coalesce("name", '') || ' ' ||
  coalesce("location", '') || ' ' ||
  coalesce("industryCode", '') || ' ' ||
  coalesce("role", '')
);

CREATE INDEX IF NOT EXISTS "SourceFinderIndex_searchVector_idx"
  ON "SourceFinderIndex" USING GIN ("searchVector");

CREATE INDEX IF NOT EXISTS "SourceFinderIndex_embedding_idx"
  ON "SourceFinderIndex" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION update_source_finder_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector(
    'english',
    coalesce(NEW."searchText", '') || ' ' ||
    coalesce(NEW."name", '') || ' ' ||
    coalesce(NEW."location", '') || ' ' ||
    coalesce(NEW."industryCode", '') || ' ' ||
    coalesce(NEW."role", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS source_finder_search_vector_trigger ON "SourceFinderIndex";
CREATE TRIGGER source_finder_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "SourceFinderIndex"
  FOR EACH ROW
  EXECUTE FUNCTION update_source_finder_search_vector();
