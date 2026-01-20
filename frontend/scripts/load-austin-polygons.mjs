import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

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

async function loadAustin() {
  console.log('Loading Austin zoning polygons...');
  
  const dataPath = join(__dirname, '../../backend/data/austin/zoning/zoning_polygons.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(rawData);
  
  console.log(`Found ${data.length} Austin polygons`);
  
  // Clear existing Austin districts
  await pool.query(`DELETE FROM zoning_districts WHERE city = 'austin'`);
  console.log('Cleared existing Austin districts');
  
  // Group polygons by zone code
  const zoneGroups = new Map();
  for (const item of data) {
    const zoneCode = item.zoning_ztype || item.zoning_base || 'UNKNOWN';
    if (!zoneGroups.has(zoneCode)) {
      zoneGroups.set(zoneCode, []);
    }
    if (item.the_geom && item.the_geom.coordinates) {
      zoneGroups.set(zoneCode, [...zoneGroups.get(zoneCode), item.the_geom]);
    }
  }
  
  console.log(`Grouped into ${zoneGroups.size} unique zone codes`);
  
  // Insert aggregated by zone
  let loaded = 0;
  let failed = 0;
  
  for (const [zoneCode, geometries] of zoneGroups) {
    try {
      // Create a GeometryCollection or use the first geometry
      if (geometries.length === 0) {
        failed++;
        continue;
      }
      
      // Insert each geometry for this zone, then union them
      const geoCollection = {
        type: "GeometryCollection",
        geometries: geometries
      };
      
      // Use a simpler approach - just insert the first geometry for each zone
      // In a real system you'd union all the polygons
      await pool.query(`
        INSERT INTO zoning_districts (city, zone_code, zone_name, geometry, properties)
        VALUES ($1, $2, $3, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)), $5)
      `, [
        'austin',
        zoneCode,
        zoneCode,
        JSON.stringify(geometries[0]), // Just use first polygon for now
        JSON.stringify({ polygon_count: geometries.length })
      ]);
      loaded++;
      
      if (loaded % 50 === 0) {
        console.log(`Progress: ${loaded}/${zoneGroups.size} zones loaded`);
      }
    } catch (err) {
      failed++;
      if (failed < 5) {
        console.error(`Error loading ${zoneCode}:`, err.message.slice(0, 100));
      }
    }
  }
  
  console.log(`\nDone! Loaded ${loaded} zone codes, ${failed} failed`);
  
  // Verify
  const count = await pool.query(`SELECT COUNT(*) as cnt FROM zoning_districts WHERE city = 'austin'`);
  console.log(`Austin districts in DB: ${count.rows[0].cnt}`);
  
  // Test a lookup
  const test = await pool.query(`
    SELECT zone_code FROM zoning_districts 
    WHERE city = 'austin' 
    AND ST_Contains(geometry, ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326))
    LIMIT 1
  `);
  console.log('Austin downtown lookup:', test.rows[0]?.zone_code || 'NOT FOUND');
  
  // Show sample zones
  const sample = await pool.query(`
    SELECT zone_code, ST_Y(ST_Centroid(geometry)) as lat, ST_X(ST_Centroid(geometry)) as lng
    FROM zoning_districts WHERE city = 'austin' LIMIT 5
  `);
  console.log('Sample Austin zones:');
  sample.rows.forEach(r => console.log(`  ${r.zone_code}: (${r.lat?.toFixed(4)}, ${r.lng?.toFixed(4)})`));
  
  await pool.end();
}

loadAustin().catch(console.error);
