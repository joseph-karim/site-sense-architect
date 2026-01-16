import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

function parseArgs(argv) {
  const args = { limitPerCity: 200, out: "src/lib/seo/zoningIndex.data.ts" };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--out") args.out = argv[++i];
    else if (token === "--limit-per-city") args.limitPerCity = Number(argv[++i]);
  }
  if (!Number.isFinite(args.limitPerCity) || args.limitPerCity <= 0) args.limitPerCity = 200;
  return args;
}

function getConnectionString() {
  return (
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    null
  );
}

function escapeTsString(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${");
}

function renderFile({ rowsByCity }) {
  const cities = ["seattle", "austin", "chicago"];
  const lines = [];
  lines.push(`import type { City } from "@/lib/cities";`);
  lines.push(``);
  lines.push(`export type ZoningIndexRow = { zone_code: string; zone_name: string };`);
  lines.push(``);
  lines.push(`// GENERATED FILE — do not hand-edit.`);
  lines.push(`// Run: node scripts/export-zoning-index.mjs --limit-per-city 200`);
  lines.push(`export const ZoningIndexByCity: Record<City, ZoningIndexRow[]> = {`);
  for (const city of cities) {
    const rows = rowsByCity[city] ?? [];
    lines.push(`  ${city}: [`);
    for (const r of rows) {
      lines.push(
        `    { zone_code: \`${escapeTsString(r.zone_code)}\`, zone_name: \`${escapeTsString(r.zone_name)}\` },`
      );
    }
    lines.push(`  ],`);
  }
  lines.push(`};`);
  lines.push(``);
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error("Missing DATABASE_URL or SUPABASE_DATABASE_URL.");
    process.exit(1);
  }

  const { Pool } = pg;
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
    max: 3,
    idleTimeoutMillis: 30_000
  });

  const cities = ["seattle", "austin", "chicago"];
  const rowsByCity = {};

  try {
    for (const city of cities) {
      const result = await pool.query(
        `
        SELECT zone_code, MAX(zone_name) AS zone_name
        FROM zoning_districts
        WHERE city = $1
        GROUP BY zone_code
        ORDER BY zone_code ASC
        LIMIT $2
        `,
        [city, args.limitPerCity]
      );
      rowsByCity[city] = result.rows.map((r) => ({
        zone_code: String(r.zone_code),
        zone_name: String(r.zone_name ?? r.zone_code)
      }));
      console.log(`${city}: ${rowsByCity[city].length} zones`);
    }
  } finally {
    await pool.end().catch(() => {});
  }

  const outPath = path.resolve(process.cwd(), args.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, renderFile({ rowsByCity }), "utf8");
  console.log(`Wrote ${outPath}`);
}

await main();

