/**
 * Export Zoning Index Script
 *
 * Generates the zoningIndex.data.ts file from the database.
 * This script enriches zone names using proper human-readable mappings.
 *
 * Usage: node scripts/export-zoning-index.mjs [--limit-per-city N] [--out path]
 */

import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

// ============================================================================
// ZONE NAME MAPPINGS (mirrors src/lib/data/zoneNameMappings.ts)
// ============================================================================

const SeattleZoneMappings = [
  { pattern: /^DOC/i, name: "Downtown Office Core" },
  { pattern: /^DRC/i, name: "Downtown Retail Core" },
  { pattern: /^DMC/i, name: "Downtown Mixed Commercial" },
  { pattern: /^DMR/i, name: "Downtown Mixed Residential" },
  { pattern: /^DH1/i, name: "Downtown Harborfront 1" },
  { pattern: /^DH2/i, name: "Downtown Harborfront 2" },
  { pattern: /^C1P?-/i, name: "Commercial 1" },
  { pattern: /^C2P?-/i, name: "Commercial 2" },
  { pattern: /^NC1P?-/i, name: "Neighborhood Commercial 1" },
  { pattern: /^NC2P?-/i, name: "Neighborhood Commercial 2" },
  { pattern: /^NC3P?-/i, name: "Neighborhood Commercial 3" },
  { pattern: /^IC-/i, name: "Industrial Commercial" },
  { pattern: /^IB/i, name: "Industrial Buffer" },
  { pattern: /^IG1/i, name: "General Industrial 1" },
  { pattern: /^IG2/i, name: "General Industrial 2" },
  { pattern: /^LR1/i, name: "Lowrise 1" },
  { pattern: /^LR2/i, name: "Lowrise 2" },
  { pattern: /^LR3/i, name: "Lowrise 3" },
  { pattern: /^MR-?/i, name: "Midrise" },
  { pattern: /^HR/i, name: "Highrise" },
  { pattern: /^SF/i, name: "Single Family" },
  { pattern: /^RSL/i, name: "Residential Small Lot" },
  { pattern: /^MIO-/i, name: "Major Institution Overlay" },
  { pattern: /^IDM/i, name: "International District Mixed" },
  { pattern: /^IDR/i, name: "International District Residential" },
  { pattern: /^PSM/i, name: "Pioneer Square Mixed" },
  { pattern: /^PMM/i, name: "Pike Market Mixed" },
  { pattern: /^MPC/i, name: "Master Planned Community" },
  { pattern: /^SM-?U?/i, name: "Seattle Mixed" },
];

const AustinZoneMappings = [
  { pattern: /^CBD/i, name: "Central Business District" },
  { pattern: /^DMU/i, name: "Downtown Mixed Use" },
  { pattern: /^CS-1/i, name: "Commercial Services 1" },
  { pattern: /^CS(?!-1)/i, name: "Commercial Services" },
  { pattern: /^CR/i, name: "Commercial Recreation" },
  { pattern: /^CH/i, name: "Commercial Highway" },
  { pattern: /^GR/i, name: "Community Commercial" },
  { pattern: /^LR/i, name: "Neighborhood Commercial" },
  { pattern: /^LO/i, name: "Limited Office" },
  { pattern: /^GO/i, name: "General Office" },
  { pattern: /^NO/i, name: "Neighborhood Office" },
  { pattern: /^MF-[1-4]/i, name: "Multifamily Residence" },
  { pattern: /^MF-[5-6]/i, name: "Multifamily Residence High Density" },
  { pattern: /^SF-/i, name: "Single Family" },
  { pattern: /^MH/i, name: "Mobile Home" },
  { pattern: /^LI/i, name: "Limited Industrial" },
  { pattern: /^MI/i, name: "Major Industrial" },
  { pattern: /^IP/i, name: "Industrial Park" },
  { pattern: /^W\/LO/i, name: "Warehouse Limited Office" },
  { pattern: /^DR/i, name: "Development Reserve" },
  { pattern: /^ERC/i, name: "East Riverside Corridor" },
  { pattern: /^TOD/i, name: "Transit Oriented Development" },
  { pattern: /^PUD/i, name: "Planned Unit Development" },
  { pattern: /^AG/i, name: "Agricultural" },
  { pattern: /^AV/i, name: "Aviation" },
  { pattern: /^P(?:-|$)/i, name: "Public" },
];

const ChicagoZoneMappings = [
  { pattern: /^B1-/i, name: "Neighborhood Shopping" },
  { pattern: /^B2-/i, name: "Neighborhood Mixed-Use" },
  { pattern: /^B3-/i, name: "Community Shopping" },
  { pattern: /^C1-/i, name: "Neighborhood Commercial" },
  { pattern: /^C2-/i, name: "Motor Vehicle-Related Commercial" },
  { pattern: /^C3-/i, name: "Commercial, Manufacturing, and Employment" },
  { pattern: /^DC-/i, name: "Downtown Core" },
  { pattern: /^DR-/i, name: "Downtown Residential" },
  { pattern: /^DS-/i, name: "Downtown Service" },
  { pattern: /^DX-/i, name: "Downtown Mixed-Use" },
  { pattern: /^M1-/i, name: "Limited Manufacturing/Business Park" },
  { pattern: /^M2-/i, name: "Light Industry" },
  { pattern: /^M3-/i, name: "Heavy Industry" },
  { pattern: /^RS-/i, name: "Residential Single-Unit" },
  { pattern: /^RT-/i, name: "Residential Two-Flat, Townhouse" },
  { pattern: /^RM-/i, name: "Residential Multi-Unit" },
  { pattern: /^PD\s*\d+/i, name: "Planned Development" },
  { pattern: /^PD$/i, name: "Planned Development" },
  { pattern: /^POS-/i, name: "Parks and Open Space" },
  { pattern: /^T/i, name: "Transportation" },
];

function getZoneMappingsForCity(city) {
  switch (city) {
    case "seattle": return SeattleZoneMappings;
    case "austin": return AustinZoneMappings;
    case "chicago": return ChicagoZoneMappings;
    default: return [];
  }
}

function formatZoneName(baseName, code) {
  // Extract height suffix if present (e.g., NC3-65 -> 65ft)
  const heightMatch = code.match(/-(\d+)(?:\s|$|\()/);
  if (heightMatch) {
    const height = heightMatch[1];
    const heightNum = parseInt(height, 10);
    if (heightNum >= 20 && heightNum <= 600) {
      return `${baseName} (${height}')`;
    }
  }

  // Extract incentive suffix if present
  const incentiveMatch = code.match(/\([\d.]+\)$/);
  if (incentiveMatch) {
    return `${baseName} Incentive`;
  }

  // Extract suffix modifiers
  const suffixes = [];
  if (/-MU/i.test(code)) suffixes.push("Mixed Use");
  if (/-V/i.test(code)) suffixes.push("Vertical Mixed Use");
  if (/-CO/i.test(code)) suffixes.push("Conditional Overlay");
  if (/-NP/i.test(code)) suffixes.push("Neighborhood Plan");
  if (/-H(?:-|$)/i.test(code)) suffixes.push("Historic");
  if (/-PUD/i.test(code)) suffixes.push("PUD");
  if (/\bRC\b/i.test(code)) suffixes.push("Residential Commercial");

  if (suffixes.length > 0) {
    return `${baseName} - ${suffixes.join(", ")}`;
  }

  return baseName;
}

function getZoneDisplayName(city, zoneCode) {
  const mappings = getZoneMappingsForCity(city);
  const code = zoneCode.trim();

  for (const mapping of mappings) {
    if (mapping.pattern.test(code)) {
      return formatZoneName(mapping.name, code);
    }
  }

  // Fallback: return the code itself
  return code.toUpperCase();
}

function isInformativeZoneName(name) {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  // If it's just a number, it's not informative
  if (/^\d+$/.test(trimmed)) return false;
  // If it's very short (1-2 chars), probably just a code repeat
  if (trimmed.length <= 2) return false;
  return true;
}

// ============================================================================
// SCRIPT FUNCTIONS
// ============================================================================

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
    process.env.DATABASE_CONNECTION_STRING ||
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
  lines.push(`// Zone names are derived from city-specific naming conventions.`);
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
    console.error("Missing DATABASE_CONNECTION_STRING or DATABASE_URL.");
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

      // Enrich zone names using our mapping
      rowsByCity[city] = result.rows.map((r) => {
        const code = String(r.zone_code);
        const dbName = String(r.zone_name ?? "");
        // Use database name only if it's informative, otherwise use our mapping
        const name = isInformativeZoneName(dbName) ? dbName : getZoneDisplayName(city, code);
        return { zone_code: code, zone_name: name };
      });

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
