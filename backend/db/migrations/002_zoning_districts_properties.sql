ALTER TABLE IF EXISTS zoning_districts
  ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}'::jsonb;

