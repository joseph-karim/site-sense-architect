#!/usr/bin/env node
/**
 * Comprehensive data load script
 * - Fixes schema if needed
 * - Imports all zoning district polygons from GeoJSON/JSON
 * - Generates zoning_rules for all unique zone codes
 * 
 * Run: node scripts/full-data-load.mjs
 */

import fs from 'fs';
import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

const connStr = process.env.DATABASE_CONNECTION_STRING;
if (!connStr) {
  console.error('DATABASE_CONNECTION_STRING not set');
  process.exit(1);
}

const url = new URL(connStr);
const pool = new pg.Pool({
  host: url.hostname,
  port: url.port,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

// ============================================================================
// STEP 1: Fix schema - ensure zoning_districts has proper geometry column
// ============================================================================
async function fixSchema() {
  console.log('\n📐 STEP 1: Checking and fixing schema...');
  
  const client = await pool.connect();
  try {
    // Check current column type
    const colCheck = await client.query(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'zoning_districts' AND column_name = 'geometry'
    `);
    
    if (colCheck.rows.length === 0) {
      console.log('  Creating zoning_districts table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS zoning_districts (
          id SERIAL PRIMARY KEY,
          city TEXT NOT NULL,
          zone_code TEXT NOT NULL,
          zone_name TEXT NOT NULL,
          geometry GEOMETRY(MultiPolygon, 4326),
          properties JSONB DEFAULT '{}',
          source_url TEXT,
          last_updated DATE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_zoning_districts_city ON zoning_districts(city);
        CREATE INDEX IF NOT EXISTS idx_zoning_districts_zone_code ON zoning_districts(zone_code);
        CREATE INDEX IF NOT EXISTS idx_zoning_districts_geometry ON zoning_districts USING GIST(geometry);
      `);
    } else if (colCheck.rows[0].udt_name !== 'geometry') {
      console.log('  Fixing geometry column type (was', colCheck.rows[0].udt_name + ')...');
      await client.query(`
        ALTER TABLE zoning_districts DROP COLUMN IF EXISTS geometry;
        ALTER TABLE zoning_districts ADD COLUMN geometry GEOMETRY(MultiPolygon, 4326);
        CREATE INDEX IF NOT EXISTS idx_zoning_districts_geometry ON zoning_districts USING GIST(geometry);
      `);
    } else {
      console.log('  ✅ Schema already correct');
    }
    
    // Ensure zoning_rules table exists with all columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS zoning_rules (
        id SERIAL PRIMARY KEY,
        city TEXT NOT NULL,
        zone_code TEXT NOT NULL,
        max_height_ft INTEGER,
        max_height_stories INTEGER,
        far NUMERIC(5,2),
        lot_coverage_pct INTEGER,
        setback_front_ft INTEGER,
        setback_side_ft INTEGER,
        setback_rear_ft INTEGER,
        parking_rules JSONB DEFAULT '{}',
        permitted_uses TEXT[] DEFAULT '{}',
        conditional_uses TEXT[] DEFAULT '{}',
        prohibited_uses TEXT[] DEFAULT '{}',
        overlays TEXT[] DEFAULT '{}',
        red_flags TEXT[] DEFAULT '{}',
        source_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(city, zone_code)
      );
    `);
    
    console.log('  ✅ Schema ready');
  } finally {
    client.release();
  }
}

// ============================================================================
// STEP 2: Import curated zoning rules
// ============================================================================
async function importCuratedRules() {
  console.log('\n📜 STEP 2: Importing curated zoning rules...');
  
  const curatedPath = join(__dirname, '../../backend/data/curated-zoning-rules.json');
  const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let count = 0;
    for (const rule of curated) {
      await client.query(`
        INSERT INTO zoning_rules (
          city, zone_code, max_height_ft, max_height_stories, far, lot_coverage_pct,
          setback_front_ft, setback_side_ft, setback_rear_ft, parking_rules,
          permitted_uses, conditional_uses, prohibited_uses, overlays, red_flags, source_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (city, zone_code) DO UPDATE SET
          max_height_ft = EXCLUDED.max_height_ft,
          max_height_stories = EXCLUDED.max_height_stories,
          far = EXCLUDED.far,
          lot_coverage_pct = EXCLUDED.lot_coverage_pct,
          setback_front_ft = EXCLUDED.setback_front_ft,
          setback_side_ft = EXCLUDED.setback_side_ft,
          setback_rear_ft = EXCLUDED.setback_rear_ft,
          parking_rules = EXCLUDED.parking_rules,
          permitted_uses = EXCLUDED.permitted_uses,
          conditional_uses = EXCLUDED.conditional_uses,
          prohibited_uses = EXCLUDED.prohibited_uses,
          overlays = EXCLUDED.overlays,
          red_flags = EXCLUDED.red_flags,
          source_url = EXCLUDED.source_url
      `, [
        rule.city,
        rule.zone_code,
        rule.max_height_ft ?? null,
        rule.max_height_stories ?? null,
        rule.far ?? null,
        rule.lot_coverage_pct ?? null,
        rule.setback_front_ft ?? null,
        rule.setback_side_ft ?? null,
        rule.setback_rear_ft ?? null,
        JSON.stringify(rule.parking_rules ?? {}),
        rule.permitted_uses ?? [],
        rule.conditional_uses ?? [],
        rule.prohibited_uses ?? [],
        rule.overlays ?? [],
        rule.red_flags ?? [],
        rule.source_url ?? ''
      ]);
      count++;
    }
    
    await client.query('COMMIT');
    console.log(`  ✅ Imported ${count} curated rules`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// STEP 3: Import Seattle GeoJSON
// ============================================================================
async function importSeattlePolygons() {
  console.log('\n🗺️  STEP 3: Importing Seattle zoning polygons...');
  
  const geojsonPath = join(__dirname, '../../backend/data/seattle/zoning/zoning.geojson');
  const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear existing Seattle data
    await client.query(`DELETE FROM zoning_districts WHERE city = 'seattle'`);
    
    // Group features by zone code
    const byZone = new Map();
    for (const feature of data.features) {
      const zoneCode = feature.properties?.ZONING;
      const zoneName = feature.properties?.ZONELUT_DE || zoneCode;
      if (!zoneCode || !feature.geometry) continue;
      
      if (!byZone.has(zoneCode)) {
        byZone.set(zoneCode, { zoneName, geometries: [], properties: feature.properties });
      }
      byZone.get(zoneCode).geometries.push(feature.geometry);
    }
    
    // Create temp table for staging
    await client.query(`
      CREATE TEMP TABLE seattle_staging (
        zone_code TEXT,
        zone_name TEXT,
        geom GEOMETRY(Geometry, 4326),
        properties JSONB
      ) ON COMMIT DROP
    `);
    
    // Insert all individual geometries
    let insertCount = 0;
    for (const [zoneCode, { zoneName, geometries, properties }] of byZone) {
      for (const geom of geometries) {
        await client.query(`
          INSERT INTO seattle_staging (zone_code, zone_name, geom, properties)
          VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4)
        `, [zoneCode, zoneName, JSON.stringify(geom), JSON.stringify(properties)]);
        insertCount++;
      }
    }
    
    // Aggregate and insert into main table
    await client.query(`
      INSERT INTO zoning_districts (city, zone_code, zone_name, geometry, properties, source_url, last_updated)
      SELECT 
        'seattle',
        zone_code,
        zone_name,
        ST_Multi(ST_Union(geom)),
        (array_agg(properties))[1],
        'https://data.seattle.gov/dataset/Zoning/2bpz-gwpy',
        CURRENT_DATE
      FROM seattle_staging
      GROUP BY zone_code, zone_name
    `);
    
    const count = byZone.size;
    
    await client.query('COMMIT');
    console.log(`  ✅ Imported ${count} Seattle zones (from ${data.features.length} polygons)`);
    return Array.from(byZone.keys());
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// STEP 4: Import Chicago JSON (different format)
// ============================================================================
async function importChicagoPolygons() {
  console.log('\n🗺️  STEP 4: Importing Chicago zoning polygons...');
  
  const jsonPath = join(__dirname, '../../backend/data/chicago/zoning/zoning.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear existing Chicago data
    await client.query(`DELETE FROM zoning_districts WHERE city = 'chicago'`);
    
    // Group by zone_class
    const byZone = new Map();
    for (const row of data) {
      const zoneCode = row.zone_class;
      if (!zoneCode || !row.the_geom) continue;
      
      if (!byZone.has(zoneCode)) {
        byZone.set(zoneCode, { geometries: [], properties: row });
      }
      byZone.get(zoneCode).geometries.push(row.the_geom);
    }
    
    // Create temp table for staging
    await client.query(`
      CREATE TEMP TABLE chicago_staging (
        zone_code TEXT,
        geom GEOMETRY(Geometry, 4326),
        properties JSONB
      ) ON COMMIT DROP
    `);
    
    // Insert all individual geometries
    for (const [zoneCode, { geometries, properties }] of byZone) {
      for (const geom of geometries) {
        await client.query(`
          INSERT INTO chicago_staging (zone_code, geom, properties)
          VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3)
        `, [zoneCode, JSON.stringify(geom), JSON.stringify(properties)]);
      }
    }
    
    // Aggregate and insert into main table
    await client.query(`
      INSERT INTO zoning_districts (city, zone_code, zone_name, geometry, properties, source_url, last_updated)
      SELECT 
        'chicago',
        zone_code,
        zone_code,
        ST_Multi(ST_Union(geom)),
        (array_agg(properties))[1],
        'https://data.cityofchicago.org/Community-Economic-Development/Boundaries-Zoning-Districts/p8va-airx',
        CURRENT_DATE
      FROM chicago_staging
      GROUP BY zone_code
    `);
    
    const count = byZone.size;
    
    await client.query('COMMIT');
    console.log(`  ✅ Imported ${count} Chicago zones (from ${data.length} polygons)`);
    return Array.from(byZone.keys());
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// STEP 5: Import Austin JSON
// ============================================================================
async function importAustinPolygons() {
  console.log('\n🗺️  STEP 5: Importing Austin zoning polygons...');
  
  const jsonPath = join(__dirname, '../../backend/data/austin/zoning/zoning_polygons.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear existing Austin data
    await client.query(`DELETE FROM zoning_districts WHERE city = 'austin'`);
    
    // Group by zoning_ztype (the main zone code)
    const byZone = new Map();
    for (const row of data) {
      const zoneCode = row.zoning_ztype || row.zoning_base;
      if (!zoneCode || !row.the_geom) continue;
      
      if (!byZone.has(zoneCode)) {
        byZone.set(zoneCode, { geometries: [], properties: row });
      }
      byZone.get(zoneCode).geometries.push(row.the_geom);
    }
    
    // Create temp table for staging
    await client.query(`
      CREATE TEMP TABLE austin_staging (
        zone_code TEXT,
        geom GEOMETRY(Geometry, 4326),
        properties JSONB
      ) ON COMMIT DROP
    `);
    
    // Insert all individual geometries
    for (const [zoneCode, { geometries, properties }] of byZone) {
      for (const geom of geometries) {
        await client.query(`
          INSERT INTO austin_staging (zone_code, geom, properties)
          VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3)
        `, [zoneCode, JSON.stringify(geom), JSON.stringify(properties)]);
      }
    }
    
    // Aggregate and insert into main table
    await client.query(`
      INSERT INTO zoning_districts (city, zone_code, zone_name, geometry, properties, source_url, last_updated)
      SELECT 
        'austin',
        zone_code,
        zone_code,
        ST_Multi(ST_Union(geom)),
        (array_agg(properties))[1],
        'https://data.austintexas.gov/Locations-and-Maps/Zoning/5rzy-nm5e',
        CURRENT_DATE
      FROM austin_staging
      GROUP BY zone_code
    `);
    
    const count = byZone.size;
    
    await client.query('COMMIT');
    console.log(`  ✅ Imported ${count} Austin zones (from ${data.length} polygons)`);
    return Array.from(byZone.keys());
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// STEP 6: Generate zoning_rules for all zones not already in curated data
// ============================================================================
async function generateMissingRules(seattleZones, chicagoZones, austinZones) {
  console.log('\n📊 STEP 6: Generating zoning rules for zones missing from curated data...');
  
  const client = await pool.connect();
  try {
    // Get existing curated zone codes
    const existing = await client.query(`SELECT city, zone_code FROM zoning_rules`);
    const existingSet = new Set(existing.rows.map(r => `${r.city}:${r.zone_code}`));
    
    await client.query('BEGIN');
    
    let generated = 0;
    
    // Process Seattle zones
    for (const zoneCode of seattleZones) {
      if (existingSet.has(`seattle:${zoneCode}`)) continue;
      
      const rule = inferZoningRule('seattle', zoneCode);
      await insertRule(client, rule);
      generated++;
    }
    
    // Process Chicago zones
    for (const zoneCode of chicagoZones) {
      if (existingSet.has(`chicago:${zoneCode}`)) continue;
      
      const rule = inferZoningRule('chicago', zoneCode);
      await insertRule(client, rule);
      generated++;
    }
    
    // Process Austin zones
    for (const zoneCode of austinZones) {
      if (existingSet.has(`austin:${zoneCode}`)) continue;
      
      const rule = inferZoningRule('austin', zoneCode);
      await insertRule(client, rule);
      generated++;
    }
    
    await client.query('COMMIT');
    console.log(`  ✅ Generated ${generated} additional zoning rules`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Infer zoning rules from zone code patterns
function inferZoningRule(city, zoneCode) {
  const code = zoneCode.toUpperCase();
  
  // Parse height from code (e.g., C1-125 -> 125, DMC-65 -> 65)
  let height = null;
  const heightMatch = code.match(/[-\/](\d{2,3})(?:\s|$|\/|-|[A-Z])/);
  if (heightMatch) height = parseInt(heightMatch[1], 10);
  else {
    const endMatch = code.match(/(\d{2,3})$/);
    if (endMatch) height = parseInt(endMatch[1], 10);
  }
  
  // Infer FAR from height
  let far = 2.0;
  if (height) {
    if (height >= 400) far = 12.0;
    else if (height >= 300) far = 10.0;
    else if (height >= 200) far = 7.0;
    else if (height >= 160) far = 6.0;
    else if (height >= 125) far = 5.0;
    else if (height >= 85) far = 4.0;
    else if (height >= 65) far = 3.5;
    else if (height >= 40) far = 2.5;
  }
  
  // Infer uses based on zone type prefix
  let permitted = ['office', 'retail', 'restaurant'];
  let conditional = ['entertainment'];
  let prohibited = ['heavy manufacturing'];
  let overlays = [];
  
  // Seattle patterns
  if (code.match(/^DMC/)) {
    permitted = ['office', 'retail', 'restaurant', 'hotel', 'entertainment', 'residential', 'healthcare'];
    conditional = [];
    prohibited = ['auto repair', 'heavy manufacturing', 'outdoor storage'];
    overlays = ['Downtown Mixed Commercial'];
  } else if (code.match(/^DOC/)) {
    permitted = ['office', 'retail', 'restaurant', 'hotel'];
    conditional = ['residential'];
    prohibited = ['manufacturing', 'auto repair'];
    overlays = ['Downtown Office Core'];
  } else if (code.match(/^DRC/)) {
    permitted = ['office', 'retail', 'restaurant', 'hotel', 'entertainment'];
    conditional = [];
    prohibited = ['manufacturing', 'auto repair'];
    overlays = ['Downtown Retail Core'];
  } else if (code.match(/^NC\d/)) {
    permitted = ['retail', 'restaurant', 'office', 'personal services', 'residential above ground floor'];
    conditional = ['bar', 'entertainment', 'drive-through'];
    prohibited = ['heavy manufacturing', 'industrial', 'warehouse'];
    overlays = ['Neighborhood Commercial'];
  } else if (code.match(/^C\d/)) {
    permitted = ['office', 'retail', 'restaurant', 'hotel', 'personal services'];
    conditional = ['entertainment', 'nightclub', 'drive-through'];
    prohibited = ['heavy manufacturing', 'junkyard', 'auto repair'];
    overlays = ['Commercial'];
  } else if (code.match(/^I[BGC]/)) {
    permitted = ['office', 'light manufacturing', 'warehouse', 'research lab'];
    conditional = ['retail', 'restaurant'];
    prohibited = ['residential', 'hotel', 'school'];
    overlays = ['Industrial'];
  } else if (code.match(/^IG/)) {
    permitted = ['light manufacturing', 'warehouse', 'industrial'];
    conditional = ['office'];
    prohibited = ['residential', 'retail', 'hotel'];
    overlays = ['General Industrial'];
  } else if (code.match(/^(LR|MR|HR)/)) {
    permitted = ['residential', 'home office'];
    conditional = ['daycare', 'small retail', 'community facility'];
    prohibited = ['commercial', 'manufacturing', 'industrial'];
    overlays = ['Residential'];
  } else if (code.match(/^IDM/)) {
    permitted = ['office', 'retail', 'restaurant', 'residential', 'cultural'];
    conditional = ['entertainment'];
    prohibited = ['heavy manufacturing'];
    overlays = ['International District Mixed'];
  } else if (code.match(/^PSM/)) {
    permitted = ['office', 'retail', 'restaurant', 'residential'];
    conditional = ['entertainment'];
    prohibited = ['manufacturing'];
    overlays = ['Pioneer Square Mixed'];
  } else if (code.match(/^PMM/)) {
    permitted = ['retail', 'restaurant', 'office'];
    conditional = ['residential'];
    prohibited = ['manufacturing', 'auto uses'];
    overlays = ['Pike Place Market'];
  }
  
  // Chicago patterns
  else if (code.match(/^B\d/)) {
    permitted = ['retail', 'restaurant', 'personal services', 'office'];
    conditional = ['day care', 'entertainment', 'residential above ground floor'];
    prohibited = ['manufacturing', 'warehouse', 'auto repair'];
    overlays = ['Business'];
  } else if (code.match(/^DX/)) {
    permitted = ['office', 'retail', 'restaurant', 'hotel', 'entertainment', 'residential', 'healthcare'];
    conditional = [];
    prohibited = ['auto repair', 'manufacturing', 'warehouse', 'outdoor storage'];
    overlays = ['Downtown Mixed-Use'];
  } else if (code.match(/^DC/)) {
    permitted = ['office', 'retail', 'restaurant', 'hotel', 'entertainment', 'residential'];
    conditional = [];
    prohibited = ['auto repair', 'manufacturing', 'warehouse', 'outdoor storage'];
    overlays = ['Downtown Core'];
  } else if (code.match(/^DR/)) {
    permitted = ['residential', 'retail', 'restaurant'];
    conditional = ['office'];
    prohibited = ['manufacturing', 'warehouse'];
    overlays = ['Downtown Residential'];
  } else if (code.match(/^DS/)) {
    permitted = ['office', 'retail', 'light industrial'];
    conditional = ['residential'];
    prohibited = ['heavy manufacturing'];
    overlays = ['Downtown Service'];
  } else if (code.match(/^M\d/)) {
    permitted = ['light manufacturing', 'warehouse', 'office', 'research lab'];
    conditional = ['retail (limited)', 'restaurant'];
    prohibited = ['residential'];
    overlays = ['Manufacturing'];
  } else if (code.match(/^PMD/)) {
    permitted = ['manufacturing', 'warehouse', 'industrial'];
    conditional = ['office'];
    prohibited = ['residential', 'retail'];
    overlays = ['Planned Manufacturing District'];
  }
  
  // Austin patterns
  else if (code.match(/^CBD/)) {
    permitted = ['office', 'retail', 'restaurant', 'hotel', 'entertainment', 'residential', 'healthcare'];
    conditional = [];
    prohibited = ['auto repair', 'heavy manufacturing', 'outdoor storage', 'warehousing'];
    overlays = ['Central Business District'];
    far = 8.0;
    height = null; // No height limit in CBD
  } else if (code.match(/^CS/)) {
    permitted = ['office', 'retail', 'restaurant', 'commercial services', 'light manufacturing'];
    conditional = ['auto sales', 'outdoor storage'];
    prohibited = ['heavy manufacturing', 'warehousing'];
    overlays = ['General Commercial Services'];
  } else if (code.match(/^G[RO]/)) {
    permitted = ['office', 'retail', 'restaurant', 'personal services'];
    conditional = ['drive-through', 'auto sales'];
    prohibited = ['heavy manufacturing', 'outdoor storage'];
    overlays = ['General Commercial'];
  } else if (code.match(/^L[ORI]/)) {
    permitted = ['office', 'medical clinic', 'professional services'];
    conditional = ['day care', 'restaurant'];
    prohibited = ['retail', 'manufacturing', 'warehouse'];
    overlays = ['Limited Office/Industrial'];
  } else if (code.match(/^(MF|SF)/)) {
    permitted = ['residential'];
    conditional = ['home office', 'daycare'];
    prohibited = ['commercial', 'manufacturing'];
    overlays = ['Residential'];
  } else if (code.match(/^NO/)) {
    permitted = ['office', 'professional services'];
    conditional = ['restaurant', 'small retail'];
    prohibited = ['manufacturing', 'warehouse'];
    overlays = ['Neighborhood Office'];
  }
  
  // Setbacks
  let setbacks = { front: 0, side: 0, rear: 0 };
  if (code.match(/^(LR|MR|SF|R\d|MF)/i)) {
    setbacks = { front: 10, side: 5, rear: 15 };
  } else if (code.match(/^NC/i)) {
    setbacks = { front: 5, side: 0, rear: 10 };
  } else if (code.match(/^(DMC|DOC|DRC|DX|DC|CBD)/i)) {
    setbacks = { front: 0, side: 0, rear: 0 };
  }
  
  // Lot coverage
  let lotCoverage = 75;
  if (code.match(/^(DMC|DOC|DRC|DX|DC|CBD)/i)) {
    lotCoverage = 100;
  } else if (code.match(/^(LR|MR|SF|MF)/i)) {
    lotCoverage = 50;
  } else if (height && height >= 65) {
    lotCoverage = 85;
  }
  
  const sourceUrls = {
    seattle: 'https://library.municode.com/wa/seattle/codes/municipal_code',
    chicago: 'https://www.chicago.gov/city/en/depts/dcd/provdrs/zoning.html',
    austin: 'https://library.municode.com/tx/austin/codes/land_development_code'
  };
  
  return {
    city,
    zone_code: zoneCode,
    max_height_ft: height,
    far,
    lot_coverage_pct: lotCoverage,
    setback_front_ft: setbacks.front,
    setback_side_ft: setbacks.side,
    setback_rear_ft: setbacks.rear,
    permitted_uses: permitted,
    conditional_uses: conditional,
    prohibited_uses: prohibited,
    overlays,
    source_url: sourceUrls[city] || ''
  };
}

async function insertRule(client, rule) {
  await client.query(`
    INSERT INTO zoning_rules (
      city, zone_code, max_height_ft, far, lot_coverage_pct,
      setback_front_ft, setback_side_ft, setback_rear_ft,
      permitted_uses, conditional_uses, prohibited_uses, overlays, source_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (city, zone_code) DO NOTHING
  `, [
    rule.city,
    rule.zone_code,
    rule.max_height_ft,
    rule.far,
    rule.lot_coverage_pct,
    rule.setback_front_ft,
    rule.setback_side_ft,
    rule.setback_rear_ft,
    rule.permitted_uses,
    rule.conditional_uses,
    rule.prohibited_uses,
    rule.overlays,
    rule.source_url
  ]);
}

// ============================================================================
// STEP 7: Summary
// ============================================================================
async function printSummary() {
  console.log('\n📈 SUMMARY:');
  
  const districts = await pool.query(`
    SELECT city, COUNT(*)::int as zones, SUM(ST_NumGeometries(geometry))::int as polygons
    FROM zoning_districts 
    GROUP BY city 
    ORDER BY city
  `);
  
  console.log('\n  Zoning Districts (polygons):');
  for (const row of districts.rows) {
    console.log(`    ${row.city}: ${row.zones} zones (${row.polygons} polygon parts)`);
  }
  
  const rules = await pool.query(`
    SELECT city, COUNT(*)::int as count 
    FROM zoning_rules 
    GROUP BY city 
    ORDER BY city
  `);
  
  console.log('\n  Zoning Rules:');
  for (const row of rules.rows) {
    console.log(`    ${row.city}: ${row.count} rules`);
  }
  
  // Total
  const totalDistricts = await pool.query(`SELECT COUNT(*)::int as c FROM zoning_districts`);
  const totalRules = await pool.query(`SELECT COUNT(*)::int as c FROM zoning_rules`);
  
  console.log('\n  TOTALS:');
  console.log(`    ${totalDistricts.rows[0].c} zoning districts`);
  console.log(`    ${totalRules.rows[0].c} zoning rules`);
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('🚀 Starting comprehensive data load...');
  console.log('   Database:', url.hostname);
  
  try {
    await fixSchema();
    await importCuratedRules();
    
    const seattleZones = await importSeattlePolygons();
    const chicagoZones = await importChicagoPolygons();
    const austinZones = await importAustinPolygons();
    
    await generateMissingRules(seattleZones, chicagoZones, austinZones);
    await printSummary();
    
    console.log('\n✅ Data load complete!');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
