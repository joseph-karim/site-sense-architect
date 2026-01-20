import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

// Try multiple env var names
const connStr = process.env.DATABASE_CONNECTION_STRING || process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
console.log('Connection string found:', connStr ? 'YES' : 'NO');

if (!connStr) {
  console.log('No connection string! Check .env.local');
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

async function check() {
  try {
    // Check districts (polygons)
    const districts = await pool.query(`
      SELECT city, COUNT(*)::int as zones, 
             COUNT(DISTINCT zone_code)::int as unique_codes
      FROM zoning_districts GROUP BY city ORDER BY city
    `);
    console.log('\n=== ZONING DISTRICTS (GIS Polygons) ===');
    if (districts.rows.length === 0) {
      console.log('  NO DISTRICTS LOADED - polygon table is empty!');
    } else {
      let total = 0;
      districts.rows.forEach(r => {
        console.log(`  ${r.city}: ${r.zones} polygons, ${r.unique_codes} unique zones`);
        total += r.zones;
      });
      console.log(`  TOTAL: ${total} polygons`);
    }
    
    // Check address lookups
    const addresses = await pool.query(`
      SELECT city, COUNT(*)::int as cnt 
      FROM address_zoning 
      GROUP BY city ORDER BY city
    `);
    console.log('\n=== ADDRESS ZONING (Direct Lookups) ===');
    if (addresses.rows.length === 0) {
      console.log('  NO ADDRESSES LOADED');
    } else {
      let totalAddr = 0;
      addresses.rows.forEach(r => {
        console.log(`  ${r.city}: ${r.cnt} addresses`);
        totalAddr += r.cnt;
      });
      console.log(`  TOTAL: ${totalAddr} addresses`);
    }
    
    // Check rules
    const rules = await pool.query('SELECT city, COUNT(*)::int as cnt FROM zoning_rules GROUP BY city ORDER BY city');
    console.log('\n=== ZONING RULES (Use/Dimensional Data) ===');
    let totalRules = 0;
    rules.rows.forEach(r => {
      console.log(`  ${r.city}: ${r.cnt} rules`);
      totalRules += r.cnt;
    });
    console.log(`  TOTAL: ${totalRules} rules`);
    
    // Test point lookups
    console.log('\n=== GIS POINT LOOKUPS ===');
    
    // Seattle downtown (Pine St area)
    const seattle = await pool.query(`
      SELECT zone_code, zone_name, city 
      FROM zoning_districts 
      WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(-122.3331, 47.6097), 4326))
      LIMIT 1
    `);
    console.log('Seattle (47.6097, -122.3331):', seattle.rows[0]?.zone_code || 'NOT FOUND');
    
    // Chicago downtown (Willis Tower area)
    const chicago = await pool.query(`
      SELECT zone_code, zone_name, city 
      FROM zoning_districts 
      WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(-87.6359, 41.8789), 4326))
      LIMIT 1
    `);
    console.log('Chicago (41.8789, -87.6359):', chicago.rows[0]?.zone_code || 'NOT FOUND');
    
    // Austin downtown (Congress Ave) - no GIS polygons
    const austin = await pool.query(`
      SELECT zone_code, zone_name, city 
      FROM zoning_districts 
      WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326))
      LIMIT 1
    `);
    console.log('Austin GIS (30.2672, -97.7431):', austin.rows[0]?.zone_code || 'NOT FOUND (use address lookup)');
    
    // Test address lookups
    console.log('\n=== ADDRESS LOOKUPS ===');
    const austinAddr = await pool.query(`
      SELECT full_address, zone_code, zone_category 
      FROM address_zoning 
      WHERE city = 'austin' AND normalized_address LIKE '%congress%'
      LIMIT 3
    `);
    console.log('Austin Congress Ave samples:');
    austinAddr.rows.forEach(r => {
      console.log(`  ${r.full_address}: ${r.zone_code} (${r.zone_category || 'n/a'})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
