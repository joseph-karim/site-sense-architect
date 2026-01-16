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
  const c = city.toLowerCase();
  if (!["seattle", "austin", "chicago"].includes(c)) throw new Error(`Unsupported city: ${city}`);
  return c;
}

function getNested(record, path) {
  if (!path) return undefined;
  const parts = String(path).split(".");
  let cur = record;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function diffDays(isoStart, isoEnd) {
  if (!isoStart || !isoEnd) return null;
  const start = new Date(`${isoStart}T00:00:00.000Z`);
  const end = new Date(`${isoEnd}T00:00:00.000Z`);
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 86400000);
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const args = parseArgs(process.argv);
  const city = normalizeCity(requireArg(args, "city"));
  const file = requireArg(args, "file");

  const permitNumberField = requireArg(args, "permit-number-field");
  const permitTypeField = requireArg(args, "permit-type-field");

  const projectTypeField = args["project-type-field"] ? String(args["project-type-field"]) : null;
  const applicationDateField = args["application-date-field"] ? String(args["application-date-field"]) : null;
  const issueDateField = args["issue-date-field"] ? String(args["issue-date-field"]) : null;
  const processingDaysField = args["processing-days-field"] ? String(args["processing-days-field"]) : null;
  const statusField = args["status-field"] ? String(args["status-field"]) : null;
  const addressField = args["address-field"] ? String(args["address-field"]) : null;
  const latField = args["lat-field"] ? String(args["lat-field"]) : null;
  const lngField = args["lng-field"] ? String(args["lng-field"]) : null;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const raw = await fs.readFile(file, "utf8");
  const json = JSON.parse(raw);
  const rows = Array.isArray(json) ? json : Array.isArray(json?.results) ? json.results : null;
  if (!rows) throw new Error("Expected an array of permit rows (or {results: []})");

  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let inserted = 0;
    for (const record of rows) {
      const permitNumber = String(getNested(record, permitNumberField) ?? "").trim();
      const permitType = String(getNested(record, permitTypeField) ?? "").trim();
      if (!permitNumber || !permitType) continue;

      const projectType = projectTypeField ? String(getNested(record, projectTypeField) ?? "").trim() : null;
      const applicationDate = toDate(applicationDateField ? getNested(record, applicationDateField) : null);
      const issueDate = toDate(issueDateField ? getNested(record, issueDateField) : null);
      const processingDays =
        toNumber(processingDaysField ? getNested(record, processingDaysField) : null) ??
        diffDays(applicationDate, issueDate);
      const status = statusField ? String(getNested(record, statusField) ?? "").trim() : null;
      const address = addressField ? String(getNested(record, addressField) ?? "").trim() : null;

      const lat =
        toNumber(latField ? getNested(record, latField) : null) ??
        toNumber(getNested(record, "location.latitude")) ??
        toNumber(getNested(record, "latitude"));
      const lng =
        toNumber(lngField ? getNested(record, lngField) : null) ??
        toNumber(getNested(record, "location.longitude")) ??
        toNumber(getNested(record, "longitude"));

      await client.query(
        `
        INSERT INTO permits (
          city,
          permit_number,
          permit_type,
          project_type,
          application_date,
          issue_date,
          processing_days,
          status,
          address,
          lat,
          lng
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (city, permit_number) DO UPDATE SET
          permit_type = EXCLUDED.permit_type,
          project_type = EXCLUDED.project_type,
          application_date = EXCLUDED.application_date,
          issue_date = EXCLUDED.issue_date,
          processing_days = EXCLUDED.processing_days,
          status = EXCLUDED.status,
          address = EXCLUDED.address,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng
        `,
        [
          city,
          permitNumber,
          permitType,
          projectType || null,
          applicationDate,
          issueDate,
          processingDays,
          status || null,
          address || null,
          lat,
          lng
        ]
      );
      inserted++;
    }

    await client.query("COMMIT");
    console.log(`Upserted ${inserted} permits for ${city} from ${file}`);
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
