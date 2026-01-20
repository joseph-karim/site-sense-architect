import fs from "node:fs/promises";
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env.local") });

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const value = argv[i];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function requireArg(args, key) {
  const value = args[key];
  if (!value || value === true) throw new Error(`Missing required arg: --${key}`);
  return String(value);
}

function normalizeCity(city) {
  const c = city.toLowerCase();
  if (!["seattle", "austin", "chicago"].includes(c)) throw new Error(`Unsupported city: ${city}`);
  return c;
}

function getProp(obj, path) {
  const parts = String(path).split(".");
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function parseCsvList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

async function main() {
  const args = parseArgs(process.argv);
  const city = normalizeCity(requireArg(args, "city"));
  const file = requireArg(args, "file");
  const zoneCodeField = requireArg(args, "zone-code-field");
  const zoneNameField = args["zone-name-field"] ? String(args["zone-name-field"]) : null;
  const geometryField = args["geometry-field"] ? String(args["geometry-field"]) : "geometry";
  const propsFields = parseCsvList(args["props-fields"]);
  const sourceUrl = requireArg(args, "source-url");
  const lastUpdated = requireArg(args, "last-updated");
  const replace = args.replace !== "false";

  // Get database URL: prefer full URL, or build from components, or use DATABASE_URL
  let databaseUrl = process.env.DATABASE_CONNECTION_STRING || process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  
  // If no full URL, try building from individual components
  if (!databaseUrl && process.env.SUPABASE_DB_HOST && process.env.SUPABASE_DB_USER && process.env.SUPABASE_DB_PASSWORD) {
    const host = process.env.SUPABASE_DB_HOST;
    const port = process.env.SUPABASE_DB_PORT || "5432";
    const user = process.env.SUPABASE_DB_USER;
    const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
    const database = process.env.SUPABASE_DB_NAME || "postgres";
    const sslMode = process.env.SUPABASE_DB_SSL || "require";
    databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;
  }
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL, SUPABASE_DATABASE_URL, or SUPABASE_DB_* components are required");
  }

  const raw = await fs.readFile(file, "utf8");
  const geojson = JSON.parse(raw);
  const features = Array.isArray(geojson?.features)
    ? geojson.features.map((f) => ({
        geometry: f?.geometry,
        properties: f?.properties ?? {}
      }))
    : Array.isArray(geojson)
      ? geojson.map((row) => ({
          geometry: getProp(row, geometryField),
          properties: row ?? {}
        }))
      : null;
  if (!features) {
    throw new Error("Expected GeoJSON FeatureCollection or an array of rows with a geometry field");
  }

  const { Pool } = pg;
  const needsSsl = databaseUrl.includes('supabase.co') || databaseUrl.includes('sslmode=require');
  const cleanUrl = databaseUrl.replace(/[?&]sslmode=[^&]+/, '');
  const pool = new Pool({ 
    connectionString: cleanUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TEMP TABLE zoning_districts_staging (
        zone_code TEXT NOT NULL,
        zone_name TEXT NOT NULL,
        geometry GEOMETRY(Geometry, 4326) NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb
      ) ON COMMIT DROP;
    `);

    for (const feature of features) {
      const geometry = feature?.geometry;
      const props = feature?.properties ?? {};
      if (!geometry) continue;

      const zoneCode = String(getProp(props, zoneCodeField) ?? "").trim();
      if (!zoneCode) continue;
      const zoneName = String((zoneNameField ? getProp(props, zoneNameField) : null) ?? zoneCode).trim();

      const picked = {};
      for (const key of propsFields) {
        const value = getProp(props, key);
        if (value === undefined || value === null || value === "") continue;
        picked[key] = value;
      }

      await client.query(
        `
        INSERT INTO zoning_districts_staging (zone_code, zone_name, geometry, properties)
        VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4::jsonb)
        `,
        [zoneCode, zoneName, JSON.stringify(geometry), JSON.stringify(picked)]
      );
    }

    if (replace) {
      await client.query(`DELETE FROM zoning_districts WHERE city = $1`, [city]);
    }

    await client.query(
      `
      INSERT INTO zoning_districts (city, zone_code, zone_name, geometry, properties, source_url, last_updated)
      SELECT
        $1 AS city,
        zone_code,
        zone_name,
        ST_Multi(ST_UnaryUnion(ST_Collect(geometry))) AS geometry,
        COALESCE(jsonb_agg(DISTINCT properties) FILTER (WHERE properties <> '{}'::jsonb), '[]'::jsonb) AS properties,
        $2 AS source_url,
        $3::date AS last_updated
      FROM zoning_districts_staging
      GROUP BY zone_code, zone_name
      `,
      [city, sourceUrl, lastUpdated]
    );

    await client.query("COMMIT");
    console.log(`Imported zoning_districts for ${city} from ${file}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(1);
});
