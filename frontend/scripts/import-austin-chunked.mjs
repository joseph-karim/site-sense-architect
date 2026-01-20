#!/usr/bin/env node
/**
 * Import Austin zoning data in chunks to avoid timeout
 * Run: node scripts/import-austin-chunked.mjs
 */
import fs from 'fs';
import pg from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const connStr = process.env.DATABASE_CONNECTION_STRING;
const url = new URL(connStr);
const pool = new pg.Pool({
  host: url.hostname,
  port: url.port,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

const BATCH_SIZE = 500;

async function main() {
  const data = JSON.parse(fs.readFileSync('../backend/data/austin/zoning/zoning_polygons.json', 'utf8'));
  console.log('Total Austin polygons:', data.length);
  
  // Group by zone code first
  const byZone = new Map();
  for (const row of data) {
    const code = row.zoning_ztype || row.zoning_base;
    if (!code || !row.the_geom) continue;
    if (!byZone.has(code)) byZone.set(code, []);
    byZone.get(code).push(row.the_geom);
  }
  
  console.log('Unique zones:', byZone.size);
  
  const client = await pool.connect();
  try {
    // Clear existing Austin data
    await client.query("DELETE FROM zoning_districts WHERE city = 'austin'");
    console.log('Cleared existing Austin data');
    
    // Process each zone
    let processed = 0;
    for (const [zoneCode, geometries] of byZone) {
      // Union all geometries for this zone in batches
      let unionedGeom = null;
      
      for (let i = 0; i < geometries.length; i += BATCH_SIZE) {
        const batch = geometries.slice(i, i + BATCH_SIZE);
        const geomCollection = { type: 'GeometryCollection', geometries: batch };
        
        if (unionedGeom === null) {
          const result = await client.query(`
            SELECT ST_AsText(ST_Multi(ST_Union(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)))) as geom
          `, [JSON.stringify(geomCollection)]);
          unionedGeom = result.rows[0].geom;
        } else {
          const result = await client.query(`
            SELECT ST_AsText(ST_Multi(ST_Union(
              ST_GeomFromText($1, 4326),
              ST_Union(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))
            ))) as geom
          `, [unionedGeom, JSON.stringify(geomCollection)]);
          unionedGeom = result.rows[0].geom;
        }
      }
      
      // Insert the final unioned geometry
      await client.query(`
        INSERT INTO zoning_districts (city, zone_code, zone_name, geometry, source_url, last_updated)
        VALUES ('austin', $1, $1, ST_GeomFromText($2, 4326), 'https://data.austintexas.gov', CURRENT_DATE)
      `, [zoneCode, unionedGeom]);
      
      processed++;
      if (processed % 20 === 0) console.log(`  Processed ${processed}/${byZone.size} zones`);
    }
    
    console.log(`✅ Imported ${processed} Austin zones`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
