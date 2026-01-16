import { getPool } from "@/lib/db/pool";

export type ZoningDistrictRow = {
  zone_code: string;
  zone_name: string;
  properties: any;
  source_url: string;
  last_updated: string;
};

export type ZoningRuleRow = {
  zone_code: string;
  max_height_ft: number | null;
  max_height_stories: number | null;
  far: number | null;
  lot_coverage_pct: number | null;
  setback_front_ft: number | null;
  setback_side_ft: number | null;
  setback_rear_ft: number | null;
  parking_rules: any;
  permitted_uses: string[];
  conditional_uses: string[];
  prohibited_uses: string[];
  overlays: string[];
  red_flags: string[];
  source_url: string;
};

export async function findZoningDistrictByPoint(input: {
  city: string;
  lat: number;
  lng: number;
}): Promise<ZoningDistrictRow | null> {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT zone_code, zone_name, properties, source_url, last_updated
    FROM zoning_districts
    WHERE city = $1
      AND ST_Contains(
        geometry,
        ST_SetSRID(ST_MakePoint($2::double precision, $3::double precision), 4326)
      )
    LIMIT 1
    `,
    [input.city, input.lng, input.lat]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    zone_code: String(row.zone_code),
    zone_name: String(row.zone_name),
    properties: row.properties ?? null,
    source_url: String(row.source_url),
    last_updated: new Date(row.last_updated).toISOString().slice(0, 10)
  };
}

export async function getZoningRulesForZone(input: {
  city: string;
  zone_code: string;
}): Promise<ZoningRuleRow | null> {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT
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
    FROM zoning_rules
    WHERE city = $1 AND zone_code = $2
    LIMIT 1
    `,
    [input.city, input.zone_code]
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    zone_code: String(row.zone_code),
    max_height_ft: row.max_height_ft ?? null,
    max_height_stories: row.max_height_stories ?? null,
    far: row.far ?? null,
    lot_coverage_pct: row.lot_coverage_pct ?? null,
    setback_front_ft: row.setback_front_ft ?? null,
    setback_side_ft: row.setback_side_ft ?? null,
    setback_rear_ft: row.setback_rear_ft ?? null,
    parking_rules: row.parking_rules ?? {},
    permitted_uses: row.permitted_uses ?? [],
    conditional_uses: row.conditional_uses ?? [],
    prohibited_uses: row.prohibited_uses ?? [],
    overlays: row.overlays ?? [],
    red_flags: row.red_flags ?? [],
    source_url: String(row.source_url)
  };
}

export async function getZoningDistrictByCode(input: {
  city: string;
  zone_code: string;
}): Promise<ZoningDistrictRow | null> {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT zone_code, zone_name, properties, source_url, last_updated
    FROM zoning_districts
    WHERE city = $1 AND zone_code = $2
    LIMIT 1
    `,
    [input.city, input.zone_code]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    zone_code: String(row.zone_code),
    zone_name: String(row.zone_name),
    properties: row.properties ?? null,
    source_url: String(row.source_url),
    last_updated: new Date(row.last_updated).toISOString().slice(0, 10)
  };
}
