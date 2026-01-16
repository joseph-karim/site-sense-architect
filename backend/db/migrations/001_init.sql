CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Addresses (geocoded lookups)
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_address TEXT NOT NULL,
  normalized_address TEXT NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  city VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_city_created_at ON addresses (city, created_at DESC);

-- Zoning districts (loaded from municipal GeoJSON)
CREATE TABLE IF NOT EXISTS zoning_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(50) NOT NULL,
  zone_code VARCHAR(50) NOT NULL,
  zone_name TEXT NOT NULL,
  geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_url TEXT NOT NULL,
  last_updated DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_zoning_districts_city_zone_code ON zoning_districts (city, zone_code);
CREATE INDEX IF NOT EXISTS idx_zoning_districts_city_zone_name ON zoning_districts (city, zone_name);
CREATE INDEX IF NOT EXISTS idx_zoning_districts_geometry ON zoning_districts USING GIST (geometry);

-- Zoning rules (manually curated per zone)
CREATE TABLE IF NOT EXISTS zoning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(50) NOT NULL,
  zone_code VARCHAR(50) NOT NULL,
  max_height_ft INTEGER,
  max_height_stories INTEGER,
  far DECIMAL(4, 2),
  lot_coverage_pct INTEGER,
  setback_front_ft INTEGER,
  setback_side_ft INTEGER,
  setback_rear_ft INTEGER,
  parking_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  permitted_uses TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  conditional_uses TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  prohibited_uses TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  overlays TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  red_flags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  source_url TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_zoning_rules_city_zone_code ON zoning_rules (city, zone_code);

-- Permit history (from Socrata APIs)
CREATE TABLE IF NOT EXISTS permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(50) NOT NULL,
  permit_number VARCHAR(50) NOT NULL,
  permit_type VARCHAR(100) NOT NULL,
  project_type VARCHAR(100),
  application_date DATE,
  issue_date DATE,
  processing_days INTEGER,
  status VARCHAR(50),
  address TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_permits_city_permit_number ON permits (city, permit_number);
CREATE INDEX IF NOT EXISTS idx_permits_city_project_type ON permits (city, project_type);
CREATE INDEX IF NOT EXISTS idx_permits_city_permit_type ON permits (city, permit_type);
CREATE INDEX IF NOT EXISTS idx_permits_city_issue_date ON permits (city, issue_date DESC);

-- Permit timeline stats (aggregated)
CREATE TABLE IF NOT EXISTS permit_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(50) NOT NULL,
  project_type VARCHAR(100) NOT NULL,
  permit_type VARCHAR(100) NOT NULL,
  p50_days INTEGER NOT NULL,
  p90_days INTEGER NOT NULL,
  sample_size INTEGER NOT NULL,
  common_delays TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  last_calculated DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_permit_stats_city_project_type_permit_type
  ON permit_stats (city, project_type, permit_type);

-- Code tripwires (hardcoded rules)
CREATE TABLE IF NOT EXISTS code_tripwires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name VARCHAR(100) NOT NULL,
  occupancy_type VARCHAR(50) NOT NULL,
  city VARCHAR(50), -- NULL = applies to all cities
  requirement TEXT NOT NULL,
  code_reference VARCHAR(50) NOT NULL,
  check_logic JSONB NOT NULL DEFAULT '{}'::jsonb,
  common_issue TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_code_tripwires_check_occ_city ON code_tripwires (check_name, occupancy_type, city);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_code_tripwires_check_occ_city_key
  ON code_tripwires (check_name, occupancy_type, COALESCE(city, ''));

-- Generated artifacts
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  address_id UUID REFERENCES addresses(id),
  city VARCHAR(50) NOT NULL,
  input_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  web_slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_email VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_artifacts_city_created_at ON artifacts (city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_type_created_at ON artifacts (type, created_at DESC);

-- Risk register items
CREATE TABLE IF NOT EXISTS risk_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  risk_id VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  source VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  consequence TEXT NOT NULL,
  part3_item_id UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_risk_items_artifact_risk_id ON risk_items (artifact_id, risk_id);
