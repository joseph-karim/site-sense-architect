import fs from "node:fs/promises";
import pg from "pg";

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
  const c = String(city).toLowerCase();
  if (!["seattle", "austin", "chicago"].includes(c)) throw new Error(`Unsupported city: ${city}`);
  return c;
}

function asInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function asNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((x) => String(x)).filter(Boolean);
  return [];
}

async function main() {
  const args = parseArgs(process.argv);
  // Get database URL: prefer full URL, or build from components, or use DATABASE_URL
  let databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  
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

  const file = requireArg(args, "file");
  const raw = await fs.readFile(file, "utf8");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("Expected JSON array of zoning rule objects");

  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let upserted = 0;
    for (const row of rows) {
      const city = normalizeCity(row.city);
      const zoneCode = String(row.zone_code ?? "").trim();
      const sourceUrl = String(row.source_url ?? "").trim();
      if (!zoneCode || !sourceUrl) continue;

      await client.query(
        `
        INSERT INTO zoning_rules (
          city,
          zone_code,
          max_height_ft,
          max_height_stories,
          far,
          lot_coverage_pct,
          setback_front_ft,
          setback_side_ft,
          setback_rear_ft,
          parking_rules,
          permitted_uses,
          conditional_uses,
          prohibited_uses,
          overlays,
          red_flags,
          source_url
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::text[],$12::text[],$13::text[],$14::text[],$15::text[],$16)
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
        `,
        [
          city,
          zoneCode,
          asInt(row.max_height_ft),
          asInt(row.max_height_stories),
          asNumber(row.far),
          asInt(row.lot_coverage_pct),
          asInt(row.setback_front_ft),
          asInt(row.setback_side_ft),
          asInt(row.setback_rear_ft),
          JSON.stringify(row.parking_rules ?? {}),
          asStringArray(row.permitted_uses),
          asStringArray(row.conditional_uses),
          asStringArray(row.prohibited_uses),
          asStringArray(row.overlays),
          asStringArray(row.red_flags),
          sourceUrl
        ]
      );
      upserted++;
    }

    await client.query("COMMIT");
    console.log(`Imported zoning_rules: upserted ${upserted} rows from ${file}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(1);
});

