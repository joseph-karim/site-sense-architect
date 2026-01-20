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

async function loadAddressZoning() {
  console.log('Setting up address_zoning table...');
  
  // Create table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS address_zoning (
      id SERIAL PRIMARY KEY,
      city VARCHAR(50) NOT NULL,
      full_address TEXT NOT NULL,
      normalized_address TEXT,
      zone_code VARCHAR(50) NOT NULL,
      base_zone VARCHAR(20),
      zone_category TEXT,
      properties JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_address_zoning_city ON address_zoning(city);
    CREATE INDEX IF NOT EXISTS idx_address_zoning_address ON address_zoning(full_address);
    CREATE INDEX IF NOT EXISTS idx_address_zoning_normalized ON address_zoning(normalized_address);
  `);
  
  console.log('Table created');
  
  // Load Austin data
  console.log('Loading Austin address-zoning data...');
  const dataPath = join(__dirname, '../../backend/data/austin/zoning/zoning_by_address.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(rawData);
  
  console.log(`Found ${data.length} Austin addresses`);
  
  // Clear existing Austin data
  await pool.query(`DELETE FROM address_zoning WHERE city = 'austin'`);
  
  // Batch insert
  const BATCH_SIZE = 500;
  let loaded = 0;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    const values = batch.map((item, idx) => {
      const offset = idx * 6;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
    }).join(',');
    
    const params = batch.flatMap(item => [
      'austin',
      item.full_street_name || '',
      (item.full_street_name || '').toLowerCase().replace(/\s+/g, ' ').trim(),
      item.zoning_ztype || item.base_zone || 'UNKNOWN',
      item.base_zone || null,
      item.base_zone_category || null
    ]);
    
    await pool.query(`
      INSERT INTO address_zoning (city, full_address, normalized_address, zone_code, base_zone, zone_category)
      VALUES ${values}
    `, params);
    
    loaded += batch.length;
    if (loaded % 10000 === 0 || loaded === data.length) {
      console.log(`Progress: ${loaded}/${data.length}`);
    }
  }
  
  console.log(`\nLoaded ${loaded} addresses`);
  
  // Verify
  const count = await pool.query(`SELECT COUNT(*)::int as cnt FROM address_zoning WHERE city = 'austin'`);
  console.log(`Austin addresses in DB: ${count.rows[0].cnt}`);
  
  // Sample lookup
  const sample = await pool.query(`
    SELECT full_address, zone_code, base_zone, zone_category 
    FROM address_zoning 
    WHERE city = 'austin' 
    LIMIT 5
  `);
  console.log('\nSample addresses:');
  sample.rows.forEach(r => console.log(`  ${r.full_address}: ${r.zone_code} (${r.zone_category || 'n/a'})`));
  
  // Test lookup
  const test = await pool.query(`
    SELECT zone_code, zone_category 
    FROM address_zoning 
    WHERE city = 'austin' 
    AND normalized_address LIKE '%congress%'
    LIMIT 3
  `);
  console.log('\nCongress Ave addresses:');
  test.rows.forEach(r => console.log(`  ${r.zone_code}: ${r.zone_category}`));
  
  await pool.end();
  console.log('\nDone!');
}

loadAddressZoning().catch(console.error);
