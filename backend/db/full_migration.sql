-- =============================================================================
-- FULL DATABASE MIGRATION SCRIPT
-- Site Sense Architect - Entitlement Intelligence Platform
-- Run this in Supabase SQL Editor (Project Settings > SQL Editor)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Note: PostGIS may not be available on all Supabase plans
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

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
  geometry JSONB, -- Using JSONB instead of PostGIS geometry for compatibility
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_url TEXT NOT NULL,
  last_updated DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_zoning_districts_city_zone_code ON zoning_districts (city, zone_code);
CREATE INDEX IF NOT EXISTS idx_zoning_districts_city_zone_name ON zoning_districts (city, zone_name);

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
  source_url TEXT NOT NULL DEFAULT ''
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

-- Part3 project handoffs
CREATE TABLE IF NOT EXISTS part3_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  city VARCHAR(50) NOT NULL,
  project_name TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  part3_external_id UUID,
  sync_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_part3_projects_artifact_id ON part3_projects (artifact_id);
CREATE INDEX IF NOT EXISTS idx_part3_projects_user_email ON part3_projects (user_email);
CREATE INDEX IF NOT EXISTS idx_part3_projects_status ON part3_projects (status);

-- =============================================================================
-- SEED DATA: CODE TRIPWIRES
-- =============================================================================

INSERT INTO code_tripwires (check_name, occupancy_type, city, requirement, code_reference, check_logic, common_issue)
VALUES
  -- Business
  ('corridor_width', 'business', NULL, 'Minimum 44 inches clear width for occupant load ≤50', 'IBC 1020.2', '{"thresholds":{"pass":">= 44","warning":"42-43","fail":"< 42"}}', 'Often designed at 42" which fails plan check'),
  ('egress_travel_distance', 'business', NULL, 'Egress travel distance must be within limits for the chosen occupancy', 'IBC 1017.1', '{}', 'Early layouts ignore travel distance and require rework'),
  ('exit_separation', 'business', NULL, 'Exit separation must meet minimum diagonal separation requirements', 'IBC 1007.1.1', '{}', 'Exits placed too close triggers plan check comments'),
  ('door_clearances_ada', 'business', NULL, 'ADA door maneuvering clearances must be satisfied at key doors', 'ADA 404.2.4', '{}', 'Door swings and adjacent walls reduce clearances'),
  ('stair_geometry', 'business', NULL, 'Stair riser/tread/handrail geometry must meet code', 'IBC 1011', '{}', 'Riser/tread mismatches require redesign'),
  ('fire_separation', 'business', NULL, 'Occupancy separations must meet required fire-resistance ratings', 'IBC Table 508.4', '{}', 'Mixed occupancies miss rated assemblies early'),
  ('occupant_load', 'business', NULL, 'Occupant load must be calculated using the correct factors', 'IBC Table 1004.5', '{}', 'Understated occupant load cascades into egress failures'),
  ('plumbing_fixture_count', 'business', NULL, 'Plumbing fixture counts must meet minimums', 'IPC Table 403.1', '{}', 'Counts are often under-scoped early'),
  ('shaft_enclosures', 'business', NULL, 'Shaft enclosures require specific ratings and continuity', 'IBC 713', '{}', 'Shaft penetrations and ratings missed until review'),
  ('exterior_wall_openings', 'business', NULL, 'Exterior wall opening limits depend on fire separation distance', 'IBC Table 705.8', '{}', 'Window-to-lot-line constraints discovered late'),

  -- Assembly
  ('corridor_width', 'assembly', NULL, 'Minimum 44 inches clear width for occupant load ≤50', 'IBC 1020.2', '{"thresholds":{"pass":">= 44","warning":"42-43","fail":"< 42"}}', 'Often designed at 42" which fails plan check'),
  ('egress_travel_distance', 'assembly', NULL, 'Egress travel distance must be within limits for the chosen occupancy', 'IBC 1017.1', '{}', 'Early layouts ignore travel distance and require rework'),
  ('exit_separation', 'assembly', NULL, 'Exit separation must meet minimum diagonal separation requirements', 'IBC 1007.1.1', '{}', 'Exits placed too close triggers plan check comments'),
  ('door_clearances_ada', 'assembly', NULL, 'ADA door maneuvering clearances must be satisfied at key doors', 'ADA 404.2.4', '{}', 'Door swings and adjacent walls reduce clearances'),
  ('stair_geometry', 'assembly', NULL, 'Stair riser/tread/handrail geometry must meet code', 'IBC 1011', '{}', 'Riser/tread mismatches require redesign'),
  ('fire_separation', 'assembly', NULL, 'Occupancy separations must meet required fire-resistance ratings', 'IBC Table 508.4', '{}', 'Mixed occupancies miss rated assemblies early'),
  ('occupant_load', 'assembly', NULL, 'Occupant load must be calculated using the correct factors', 'IBC Table 1004.5', '{}', 'Understated occupant load cascades into egress failures'),
  ('plumbing_fixture_count', 'assembly', NULL, 'Plumbing fixture counts must meet minimums', 'IPC Table 403.1', '{}', 'Counts are often under-scoped early'),
  ('shaft_enclosures', 'assembly', NULL, 'Shaft enclosures require specific ratings and continuity', 'IBC 713', '{}', 'Shaft penetrations and ratings missed until review'),
  ('exterior_wall_openings', 'assembly', NULL, 'Exterior wall opening limits depend on fire separation distance', 'IBC Table 705.8', '{}', 'Window-to-lot-line constraints discovered late'),

  -- Healthcare
  ('corridor_width', 'healthcare', NULL, 'Minimum 44 inches clear width for occupant load ≤50', 'IBC 1020.2', '{"thresholds":{"pass":">= 44","warning":"42-43","fail":"< 42"}}', 'Often designed at 42" which fails plan check'),
  ('egress_travel_distance', 'healthcare', NULL, 'Egress travel distance must be within limits for the chosen occupancy', 'IBC 1017.1', '{}', 'Early layouts ignore travel distance and require rework'),
  ('exit_separation', 'healthcare', NULL, 'Exit separation must meet minimum diagonal separation requirements', 'IBC 1007.1.1', '{}', 'Exits placed too close triggers plan check comments'),
  ('door_clearances_ada', 'healthcare', NULL, 'ADA door maneuvering clearances must be satisfied at key doors', 'ADA 404.2.4', '{}', 'Door swings and adjacent walls reduce clearances'),
  ('stair_geometry', 'healthcare', NULL, 'Stair riser/tread/handrail geometry must meet code', 'IBC 1011', '{}', 'Riser/tread mismatches require redesign'),
  ('fire_separation', 'healthcare', NULL, 'Occupancy separations must meet required fire-resistance ratings', 'IBC Table 508.4', '{}', 'Mixed occupancies miss rated assemblies early'),
  ('occupant_load', 'healthcare', NULL, 'Occupant load must be calculated using the correct factors', 'IBC Table 1004.5', '{}', 'Understated occupant load cascades into egress failures'),
  ('plumbing_fixture_count', 'healthcare', NULL, 'Plumbing fixture counts must meet minimums', 'IPC Table 403.1', '{}', 'Counts are often under-scoped early'),
  ('shaft_enclosures', 'healthcare', NULL, 'Shaft enclosures require specific ratings and continuity', 'IBC 713', '{}', 'Shaft penetrations and ratings missed until review'),
  ('exterior_wall_openings', 'healthcare', NULL, 'Exterior wall opening limits depend on fire separation distance', 'IBC Table 705.8', '{}', 'Window-to-lot-line constraints discovered late'),

  -- Mercantile
  ('corridor_width', 'mercantile', NULL, 'Minimum 44 inches clear width for occupant load ≤50', 'IBC 1020.2', '{"thresholds":{"pass":">= 44","warning":"42-43","fail":"< 42"}}', 'Often designed at 42" which fails plan check'),
  ('egress_travel_distance', 'mercantile', NULL, 'Egress travel distance must be within limits for the chosen occupancy', 'IBC 1017.1', '{}', 'Early layouts ignore travel distance and require rework'),
  ('exit_separation', 'mercantile', NULL, 'Exit separation must meet minimum diagonal separation requirements', 'IBC 1007.1.1', '{}', 'Exits placed too close triggers plan check comments'),
  ('door_clearances_ada', 'mercantile', NULL, 'ADA door maneuvering clearances must be satisfied at key doors', 'ADA 404.2.4', '{}', 'Door swings and adjacent walls reduce clearances'),
  ('stair_geometry', 'mercantile', NULL, 'Stair riser/tread/handrail geometry must meet code', 'IBC 1011', '{}', 'Riser/tread mismatches require redesign'),
  ('fire_separation', 'mercantile', NULL, 'Occupancy separations must meet required fire-resistance ratings', 'IBC Table 508.4', '{}', 'Mixed occupancies miss rated assemblies early'),
  ('occupant_load', 'mercantile', NULL, 'Occupant load must be calculated using the correct factors', 'IBC Table 1004.5', '{}', 'Understated occupant load cascades into egress failures'),
  ('plumbing_fixture_count', 'mercantile', NULL, 'Plumbing fixture counts must meet minimums', 'IPC Table 403.1', '{}', 'Counts are often under-scoped early'),
  ('shaft_enclosures', 'mercantile', NULL, 'Shaft enclosures require specific ratings and continuity', 'IBC 713', '{}', 'Shaft penetrations and ratings missed until review'),
  ('exterior_wall_openings', 'mercantile', NULL, 'Exterior wall opening limits depend on fire separation distance', 'IBC Table 705.8', '{}', 'Window-to-lot-line constraints discovered late')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SEED DATA: ZONING RULES - SEATTLE
-- =============================================================================

INSERT INTO zoning_rules (city, zone_code, max_height_ft, max_height_stories, far, lot_coverage_pct, setback_front_ft, setback_side_ft, setback_rear_ft, permitted_uses, conditional_uses, prohibited_uses, overlays, red_flags, source_url)
VALUES 
  -- Downtown Commercial Zones
  ('seattle', 'C1-125', 125, 10, 4.50, 85, 0, 0, 0,
   ARRAY['office', 'retail', 'restaurant', 'personal services', 'medical/dental clinic', 'hotel', 'live-work units'],
   ARRAY['drive-through', 'entertainment', 'mini-warehouse', 'parking garage'],
   ARRAY['heavy manufacturing', 'junkyard', 'adult entertainment', 'outdoor storage'],
   ARRAY['Downtown Urban Center', 'Pedestrian Zone', 'Transit Overlay'],
   ARRAY['Pedestrian zone limits curb cuts', 'Design review required over 75ft', 'FAR bonus requires affordable housing'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code'),
   
  ('seattle', 'C1-85', 85, 7, 4.00, 80, 0, 0, 5,
   ARRAY['office', 'retail', 'restaurant', 'personal services', 'medical/dental clinic'],
   ARRAY['drive-through', 'entertainment', 'light manufacturing'],
   ARRAY['heavy manufacturing', 'junkyard', 'outdoor storage'],
   ARRAY['Urban Center', 'Pedestrian Overlay'],
   ARRAY['Design review required', 'Ground floor retail required on arterials'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code'),
   
  ('seattle', 'C1-65', 65, 5, 3.00, 75, 5, 5, 10,
   ARRAY['office', 'retail', 'restaurant', 'bank', 'personal services'],
   ARRAY['gas station', 'car wash', 'drive-through'],
   ARRAY['heavy industrial', 'mining', 'outdoor storage yard'],
   ARRAY['Urban Village'],
   ARRAY['Conditional use requires community input', 'Parking ratio 1:1000sf'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code'),
   
  ('seattle', 'C1-40', 40, 3, 2.50, 70, 5, 5, 15,
   ARRAY['retail', 'restaurant', 'office', 'personal services'],
   ARRAY['bar', 'nightclub', 'drive-through'],
   ARRAY['heavy manufacturing', 'outdoor storage'],
   ARRAY['Residential Buffer Zone'],
   ARRAY['Height step-down near residential', 'Noise restrictions after 10pm'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code'),
   
  -- Neighborhood Commercial Zones
  ('seattle', 'NC2-40', 40, 3, 2.00, 65, 10, 5, 15,
   ARRAY['retail', 'restaurant', 'personal services', 'small office', 'daycare'],
   ARRAY['bar', 'nightclub', 'light manufacturing'],
   ARRAY['heavy manufacturing', 'warehouse over 10000sf', 'adult entertainment'],
   ARRAY['Neighborhood Commercial', 'Pedestrian Zone'],
   ARRAY['Ground floor retail required', 'Residential units encouraged above'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code'),
   
  ('seattle', 'NC2-55', 55, 4, 2.75, 70, 5, 5, 10,
   ARRAY['retail', 'restaurant', 'office', 'residential', 'live-work'],
   ARRAY['entertainment', 'light manufacturing'],
   ARRAY['heavy industrial', 'auto repair', 'outdoor storage'],
   ARRAY['Urban Village', 'Transit Overlay'],
   ARRAY['Mixed-use incentives available', 'Design review may apply'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code'),
   
  ('seattle', 'NC3-65', 65, 5, 3.25, 75, 0, 0, 10,
   ARRAY['retail', 'restaurant', 'office', 'residential', 'hotel', 'entertainment'],
   ARRAY['drive-through', 'auto sales'],
   ARRAY['heavy manufacturing', 'junkyard'],
   ARRAY['Major Transit Station', 'Urban Center'],
   ARRAY['No parking minimum near transit', 'FAR bonus for affordable housing'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code'),
   
  -- Industrial/Commercial Mixed Zones
  ('seattle', 'IC-45', 45, 4, 2.50, 75, 0, 0, 0,
   ARRAY['office', 'light manufacturing', 'warehouse', 'research facility', 'tech campus'],
   ARRAY['retail up to 25% of floor area', 'restaurant'],
   ARRAY['residential', 'hotel', 'school'],
   ARRAY['Industrial Commercial Zone'],
   ARRAY['Retail limited to 25% floor area', 'Manufacturing uses protected'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code'),
   
  ('seattle', 'IC-65', 65, 5, 3.50, 80, 0, 0, 0,
   ARRAY['office', 'light manufacturing', 'warehouse', 'research facility', 'data center'],
   ARRAY['retail', 'restaurant', 'brewery/distillery'],
   ARRAY['residential', 'hotel', 'elementary school'],
   ARRAY['Innovation District', 'Industrial Buffer'],
   ARRAY['Tech/biotech incentives', '24-hour operation permitted'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code'),
   
  -- Midrise Residential/Mixed
  ('seattle', 'MR-RC', 60, 5, 2.75, 60, 7, 7, 15,
   ARRAY['multifamily residential', 'live-work', 'small retail'],
   ARRAY['daycare', 'community center', 'small office'],
   ARRAY['manufacturing', 'warehouse', 'auto-oriented uses'],
   ARRAY['Residential Commercial', 'Urban Village Edge'],
   ARRAY['Ground floor activation required', 'Step-backs above 4th floor'],
   'https://seattle.gov/sdci/codes/codes-we-enforce/zoning-code')
ON CONFLICT (city, zone_code) DO UPDATE SET
  max_height_ft = EXCLUDED.max_height_ft,
  max_height_stories = EXCLUDED.max_height_stories,
  far = EXCLUDED.far,
  lot_coverage_pct = EXCLUDED.lot_coverage_pct,
  setback_front_ft = EXCLUDED.setback_front_ft,
  setback_side_ft = EXCLUDED.setback_side_ft,
  setback_rear_ft = EXCLUDED.setback_rear_ft,
  permitted_uses = EXCLUDED.permitted_uses,
  conditional_uses = EXCLUDED.conditional_uses,
  prohibited_uses = EXCLUDED.prohibited_uses,
  overlays = EXCLUDED.overlays,
  red_flags = EXCLUDED.red_flags,
  source_url = EXCLUDED.source_url;

-- =============================================================================
-- SEED DATA: ZONING RULES - SAN FRANCISCO
-- =============================================================================

INSERT INTO zoning_rules (city, zone_code, max_height_ft, max_height_stories, far, lot_coverage_pct, setback_front_ft, setback_side_ft, setback_rear_ft, permitted_uses, conditional_uses, prohibited_uses, overlays, red_flags, source_url)
VALUES 
  ('san-francisco', 'C-3-O', 400, 40, 9.00, 100, 0, 0, 0,
   ARRAY['office', 'retail', 'hotel', 'restaurant', 'entertainment', 'residential'],
   ARRAY['nightclub', 'live entertainment'],
   ARRAY['industrial', 'auto repair', 'outdoor storage'],
   ARRAY['Downtown Office', 'Transit Center District'],
   ARRAY['Shadow analysis required', 'Wind study required over 85ft', 'Jobs-housing linkage fee'],
   'https://sfplanning.org/zoning'),
   
  ('san-francisco', 'C-3-G', 80, 8, 5.00, 80, 0, 0, 25,
   ARRAY['office', 'retail', 'hotel', 'restaurant', 'residential above ground floor'],
   ARRAY['entertainment', 'bar', 'nightclub'],
   ARRAY['heavy industrial', 'auto body', 'warehouse'],
   ARRAY['Downtown General'],
   ARRAY['Ground floor retail required', '25% rear yard required'],
   'https://sfplanning.org/zoning'),
   
  ('san-francisco', 'NCT-3', 65, 6, 3.60, 75, 0, 0, 25,
   ARRAY['retail', 'restaurant', 'office', 'residential', 'personal services'],
   ARRAY['bar', 'entertainment', 'light manufacturing'],
   ARRAY['heavy industrial', 'drive-through', 'auto sales'],
   ARRAY['Neighborhood Commercial Transit', 'Van Ness Corridor'],
   ARRAY['Formula retail restrictions', 'Affordable housing required'],
   'https://sfplanning.org/zoning'),
   
  ('san-francisco', 'NCT-2', 45, 4, 2.50, 70, 0, 0, 25,
   ARRAY['retail', 'restaurant', 'office', 'residential'],
   ARRAY['bar', 'small entertainment'],
   ARRAY['formula retail over 4000sf', 'drive-through', 'auto uses'],
   ARRAY['Neighborhood Commercial Transit'],
   ARRAY['Formula retail conditional use', 'Community benefit required'],
   'https://sfplanning.org/zoning'),
   
  ('san-francisco', 'MUO', 58, 5, 3.25, 80, 0, 0, 15,
   ARRAY['office', 'retail', 'light industrial', 'PDR', 'arts/maker space'],
   ARRAY['residential', 'hotel'],
   ARRAY['large retail over 25000sf', 'residential-only buildings'],
   ARRAY['Mixed Use Office', 'Eastern Neighborhoods'],
   ARRAY['PDR space preservation', 'Office cap applies'],
   'https://sfplanning.org/zoning'),
   
  ('san-francisco', 'MUR', 68, 6, 4.00, 80, 0, 0, 15,
   ARRAY['residential', 'retail', 'office', 'PDR', 'live-work'],
   ARRAY['light manufacturing', 'arts/entertainment'],
   ARRAY['heavy industrial', 'large format retail'],
   ARRAY['Mixed Use Residential', 'Mission District'],
   ARRAY['Affordable housing required', 'PDR replacement required'],
   'https://sfplanning.org/zoning'),
   
  ('san-francisco', 'RH-3', 40, 3, 1.80, 55, 0, 0, 45,
   ARRAY['residential up to 3 units', 'home office', 'ADU'],
   ARRAY['group housing', 'residential care facility'],
   ARRAY['commercial', 'office', 'retail', 'industrial'],
   ARRAY['Residential House Three-Family'],
   ARRAY['45% rear yard required', 'Rent control may apply'],
   'https://sfplanning.org/zoning'),
   
  ('san-francisco', 'RM-2', 45, 4, 2.25, 65, 0, 0, 25,
   ARRAY['multifamily residential', 'group housing', 'residential care'],
   ARRAY['small retail', 'community facility'],
   ARRAY['office', 'industrial', 'large retail'],
   ARRAY['Residential Mixed Medium Density'],
   ARRAY['Density bonus available', 'Rent control applies'],
   'https://sfplanning.org/zoning')
ON CONFLICT (city, zone_code) DO UPDATE SET
  max_height_ft = EXCLUDED.max_height_ft,
  max_height_stories = EXCLUDED.max_height_stories,
  far = EXCLUDED.far,
  lot_coverage_pct = EXCLUDED.lot_coverage_pct,
  setback_front_ft = EXCLUDED.setback_front_ft,
  setback_side_ft = EXCLUDED.setback_side_ft,
  setback_rear_ft = EXCLUDED.setback_rear_ft,
  permitted_uses = EXCLUDED.permitted_uses,
  conditional_uses = EXCLUDED.conditional_uses,
  prohibited_uses = EXCLUDED.prohibited_uses,
  overlays = EXCLUDED.overlays,
  red_flags = EXCLUDED.red_flags,
  source_url = EXCLUDED.source_url;

-- =============================================================================
-- SEED DATA: ZONING RULES - LOS ANGELES
-- =============================================================================

INSERT INTO zoning_rules (city, zone_code, max_height_ft, max_height_stories, far, lot_coverage_pct, setback_front_ft, setback_side_ft, setback_rear_ft, permitted_uses, conditional_uses, prohibited_uses, overlays, red_flags, source_url)
VALUES 
  ('los-angeles', 'C2-2', 75, 6, 6.00, 100, 0, 0, 0,
   ARRAY['retail', 'office', 'restaurant', 'hotel', 'residential', 'entertainment'],
   ARRAY['auto sales', 'drive-through', 'nightclub'],
   ARRAY['heavy manufacturing', 'junkyard', 'adult entertainment near schools'],
   ARRAY['Commercial Zone', 'Transit Priority Area'],
   ARRAY['No parking minimum in TPA', 'TOC incentives available'],
   'https://planning.lacity.org/zoning/'),
   
  ('los-angeles', 'C4-2D', 75, 6, 3.00, 75, 10, 0, 15,
   ARRAY['retail', 'office', 'restaurant', 'personal services'],
   ARRAY['drive-through', 'auto repair', 'nightclub'],
   ARRAY['heavy manufacturing', 'industrial', 'outdoor storage'],
   ARRAY['Commercial Zone Height District 2D'],
   ARRAY['D limitation requires CPC approval for FAR over 3:1'],
   'https://planning.lacity.org/zoning/'),
   
  ('los-angeles', 'CM-1', 45, 3, 1.50, 75, 5, 0, 0,
   ARRAY['light manufacturing', 'office', 'research', 'warehouse', 'creative office'],
   ARRAY['retail up to 10%', 'restaurant'],
   ARRAY['residential', 'hotel', 'school', 'hospital'],
   ARRAY['Commercial Manufacturing', 'Arts District'],
   ARRAY['Live-work permitted with CUP', 'Retail limited to 10%'],
   'https://planning.lacity.org/zoning/'),
   
  ('los-angeles', 'R4-1', 45, 3, 3.00, 75, 15, 5, 15,
   ARRAY['multifamily residential', 'senior housing', 'group home'],
   ARRAY['school', 'daycare', 'religious facility'],
   ARRAY['commercial', 'retail', 'office', 'industrial'],
   ARRAY['Multiple Dwelling Zone'],
   ARRAY['Density bonus available', 'RSO rent stabilization applies'],
   'https://planning.lacity.org/zoning/'),
   
  ('los-angeles', 'RAS3', 50, 4, 3.00, 75, 10, 5, 15,
   ARRAY['multifamily residential', 'live-work', 'ground floor retail'],
   ARRAY['restaurant', 'personal services', 'office'],
   ARRAY['industrial', 'heavy commercial', 'auto uses'],
   ARRAY['Residential Accessory Services', 'Greater Downtown Housing Incentive Area'],
   ARRAY['Ground floor commercial permitted', 'Affordable housing incentives'],
   'https://planning.lacity.org/zoning/'),
   
  ('los-angeles', 'LASED', 1100, 90, 13.00, 100, 0, 0, 0,
   ARRAY['office', 'hotel', 'residential', 'retail', 'entertainment', 'mixed-use'],
   ARRAY['heliport', 'large venue'],
   ARRAY['heavy industrial', 'noxious uses'],
   ARRAY['LA Sports & Entertainment District'],
   ARRAY['Specific plan controls', 'Public benefit required', 'Design review mandatory'],
   'https://planning.lacity.org/zoning/'),
   
  ('los-angeles', 'M1-1', 45, 3, 1.50, 75, 0, 0, 0,
   ARRAY['light manufacturing', 'warehouse', 'research', 'wholesale', 'creative office'],
   ARRAY['retail showroom', 'restaurant', 'brewery'],
   ARRAY['residential', 'hotel', 'school', 'hospital'],
   ARRAY['Limited Industrial'],
   ARRAY['Industrial land protected', 'No residential conversion'],
   'https://planning.lacity.org/zoning/')
ON CONFLICT (city, zone_code) DO UPDATE SET
  max_height_ft = EXCLUDED.max_height_ft,
  max_height_stories = EXCLUDED.max_height_stories,
  far = EXCLUDED.far,
  lot_coverage_pct = EXCLUDED.lot_coverage_pct,
  setback_front_ft = EXCLUDED.setback_front_ft,
  setback_side_ft = EXCLUDED.setback_side_ft,
  setback_rear_ft = EXCLUDED.setback_rear_ft,
  permitted_uses = EXCLUDED.permitted_uses,
  conditional_uses = EXCLUDED.conditional_uses,
  prohibited_uses = EXCLUDED.prohibited_uses,
  overlays = EXCLUDED.overlays,
  red_flags = EXCLUDED.red_flags,
  source_url = EXCLUDED.source_url;

-- =============================================================================
-- SEED DATA: ZONING RULES - NEW YORK CITY
-- =============================================================================

INSERT INTO zoning_rules (city, zone_code, max_height_ft, max_height_stories, far, lot_coverage_pct, setback_front_ft, setback_side_ft, setback_rear_ft, permitted_uses, conditional_uses, prohibited_uses, overlays, red_flags, source_url)
VALUES 
  ('new-york', 'C6-6', 0, 0, 10.00, 100, 0, 0, 0,
   ARRAY['office', 'retail', 'hotel', 'residential', 'entertainment', 'community facility'],
   ARRAY['large entertainment venue', 'heliport'],
   ARRAY['manufacturing', 'heavy commercial', 'auto uses'],
   ARRAY['High Density Commercial', 'Special Midtown District'],
   ARRAY['Sky exposure plane applies', 'Inclusionary housing bonus available', 'Tower coverage limits'],
   'https://zr.planning.nyc.gov/'),
   
  ('new-york', 'C5-2', 0, 0, 10.00, 100, 0, 0, 0,
   ARRAY['office', 'retail', 'hotel', 'entertainment'],
   ARRAY['residential with special permit'],
   ARRAY['manufacturing', 'heavy commercial'],
   ARRAY['Restricted Central Commercial', 'Fifth Avenue Subdistrict'],
   ARRAY['Residential requires special permit', 'Ground floor retail required'],
   'https://zr.planning.nyc.gov/'),
   
  ('new-york', 'C4-6', 0, 0, 3.40, 80, 0, 0, 30,
   ARRAY['retail', 'office', 'hotel', 'residential', 'community facility'],
   ARRAY['entertainment', 'large retail'],
   ARRAY['manufacturing', 'heavy commercial'],
   ARRAY['General Commercial', 'Transit Zone'],
   ARRAY['Quality housing program available', 'Rear yard required'],
   'https://zr.planning.nyc.gov/'),
   
  ('new-york', 'M1-5', 0, 0, 5.00, 100, 0, 0, 0,
   ARRAY['light manufacturing', 'warehouse', 'office', 'self-storage', 'auto repair'],
   ARRAY['hotel', 'retail over 10000sf'],
   ARRAY['residential', 'community facility', 'school'],
   ARRAY['Light Manufacturing'],
   ARRAY['Office permitted by right', 'No residential allowed'],
   'https://zr.planning.nyc.gov/'),
   
  ('new-york', 'M1-6', 0, 0, 10.00, 100, 0, 0, 0,
   ARRAY['light manufacturing', 'office', 'warehouse', 'hotel', 'self-storage'],
   ARRAY['large retail', 'entertainment'],
   ARRAY['residential', 'school', 'hospital'],
   ARRAY['Light Manufacturing High Performance'],
   ARRAY['High FAR allows tall buildings', 'Industrial business zone bonuses'],
   'https://zr.planning.nyc.gov/'),
   
  ('new-york', 'R8A', 0, 0, 6.02, 70, 10, 0, 30,
   ARRAY['multifamily residential', 'community facility', 'house of worship'],
   ARRAY['school', 'medical facility'],
   ARRAY['commercial', 'manufacturing', 'retail'],
   ARRAY['Contextual Residential', 'Quality Housing'],
   ARRAY['Street wall required', 'Base height 60-85ft', 'Affordable housing bonus'],
   'https://zr.planning.nyc.gov/'),
   
  ('new-york', 'R10', 0, 0, 10.00, 70, 15, 0, 30,
   ARRAY['multifamily residential', 'community facility'],
   ARRAY['school', 'hospital'],
   ARRAY['commercial', 'manufacturing'],
   ARRAY['High Density Residential', 'Tower-on-Base'],
   ARRAY['Tower regulations apply', 'Inclusionary housing mandatory in MIH areas'],
   'https://zr.planning.nyc.gov/'),
   
  ('new-york', 'MX-8', 0, 0, 6.50, 80, 0, 0, 30,
   ARRAY['residential', 'commercial', 'light manufacturing', 'community facility'],
   ARRAY['entertainment', 'large retail'],
   ARRAY['heavy manufacturing', 'noxious uses'],
   ARRAY['Mixed Use', 'Special Mixed Use District'],
   ARRAY['Manufacturing floor area bonus', 'Affordable housing bonus'],
   'https://zr.planning.nyc.gov/')
ON CONFLICT (city, zone_code) DO UPDATE SET
  max_height_ft = EXCLUDED.max_height_ft,
  max_height_stories = EXCLUDED.max_height_stories,
  far = EXCLUDED.far,
  lot_coverage_pct = EXCLUDED.lot_coverage_pct,
  setback_front_ft = EXCLUDED.setback_front_ft,
  setback_side_ft = EXCLUDED.setback_side_ft,
  setback_rear_ft = EXCLUDED.setback_rear_ft,
  permitted_uses = EXCLUDED.permitted_uses,
  conditional_uses = EXCLUDED.conditional_uses,
  prohibited_uses = EXCLUDED.prohibited_uses,
  overlays = EXCLUDED.overlays,
  red_flags = EXCLUDED.red_flags,
  source_url = EXCLUDED.source_url;

-- =============================================================================
-- SEED DATA: PERMIT STATS (Sample Data)
-- =============================================================================

INSERT INTO permit_stats (city, project_type, permit_type, p50_days, p90_days, sample_size, common_delays)
VALUES
  ('seattle', 'commercial', 'building permit', 120, 240, 342, ARRAY['Design review delays', 'SEPA requirements', 'Utility coordination']),
  ('seattle', 'commercial', 'tenant improvement', 45, 90, 856, ARRAY['Fire alarm review', 'Accessibility compliance', 'MEP coordination']),
  ('seattle', 'mixed-use', 'building permit', 150, 300, 156, ARRAY['Design review', 'Affordable housing compliance', 'Transportation review']),
  ('san-francisco', 'commercial', 'building permit', 180, 360, 234, ARRAY['Planning review', 'Historic review', 'Shadow analysis']),
  ('san-francisco', 'commercial', 'tenant improvement', 60, 120, 678, ARRAY['ADA compliance', 'Fire review', 'Health department']),
  ('san-francisco', 'mixed-use', 'building permit', 240, 480, 98, ARRAY['Affordable housing', 'CEQA compliance', 'Design review']),
  ('los-angeles', 'commercial', 'building permit', 90, 180, 567, ARRAY['Plan check corrections', 'Fire life safety', 'Grading review']),
  ('los-angeles', 'commercial', 'tenant improvement', 30, 75, 1234, ARRAY['Plan check', 'Fire clearance', 'Health clearance']),
  ('los-angeles', 'mixed-use', 'building permit', 120, 240, 289, ARRAY['TOC compliance', 'Design review', 'Affordable housing']),
  ('new-york', 'commercial', 'building permit', 150, 300, 423, ARRAY['DOB plan exam', 'Fire department review', 'Zoning review']),
  ('new-york', 'commercial', 'tenant improvement', 45, 100, 2345, ARRAY['DOB review', 'Fire suppression', 'Accessibility']),
  ('new-york', 'mixed-use', 'building permit', 200, 400, 178, ARRAY['Inclusionary housing', 'ULURP if applicable', 'Environmental review'])
ON CONFLICT (city, project_type, permit_type) DO UPDATE SET
  p50_days = EXCLUDED.p50_days,
  p90_days = EXCLUDED.p90_days,
  sample_size = EXCLUDED.sample_size,
  common_delays = EXCLUDED.common_delays;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify tables created
SELECT 'Tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('addresses', 'zoning_districts', 'zoning_rules', 'permits', 'permit_stats', 'code_tripwires', 'artifacts', 'risk_items', 'part3_projects')
ORDER BY table_name;

-- Verify data counts
SELECT 'Data counts:' as status;
SELECT 'zoning_rules' as table_name, COUNT(*) as count FROM zoning_rules
UNION ALL
SELECT 'code_tripwires', COUNT(*) FROM code_tripwires
UNION ALL
SELECT 'permit_stats', COUNT(*) FROM permit_stats;

-- Show zoning rules summary by city
SELECT 'Zoning rules by city:' as status;
SELECT city, COUNT(*) as zone_count FROM zoning_rules GROUP BY city ORDER BY city;
