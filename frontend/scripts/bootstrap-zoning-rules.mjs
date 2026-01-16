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

function normalizeCity(city) {
  const c = String(city).toLowerCase();
  if (!["seattle", "austin", "chicago"].includes(c)) throw new Error(`Unsupported city: ${city}`);
  return c;
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

  const city = args.city ? normalizeCity(args.city) : null;

  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    const where = city ? "WHERE city = $1" : "";
    const params = city ? [city] : [];
    const zones = await client.query(
      `
      SELECT city, zone_code, MAX(source_url) AS source_url
      FROM zoning_districts
      ${where}
      GROUP BY city, zone_code
      ORDER BY city, zone_code
      `,
      params
    );

    let inserted = 0;
    for (const row of zones.rows) {
      const src = row.source_url ? String(row.source_url) : "https://example.com";
      const result = await client.query(
        `
        INSERT INTO zoning_rules (
          city,
          zone_code,
          parking_rules,
          permitted_uses,
          conditional_uses,
          prohibited_uses,
          overlays,
          red_flags,
          source_url
        )
        VALUES (
          $1,
          $2,
          $3::jsonb,
          $4::text[],
          $5::text[],
          $6::text[],
          $7::text[],
          $8::text[],
          $9
        )
        ON CONFLICT (city, zone_code) DO NOTHING
        `,
        [
          String(row.city),
          String(row.zone_code),
          JSON.stringify({ summary: "TBD — curate per zone and city ordinance." }),
          [],
          [],
          [],
          [],
          [],
          src
        ]
      );
      inserted += result.rowCount ?? 0;
    }

    console.log(`Bootstrapped zoning_rules: inserted ${inserted} rows${city ? ` for ${city}` : ""}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(1);
});

