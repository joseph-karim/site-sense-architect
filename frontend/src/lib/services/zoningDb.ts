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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'zoningDb.ts:61',message:'getZoningRulesForZone entry',data:{city:input.city,zone_code:input.zone_code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const pool = getPool();
  if (!pool) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'zoningDb.ts:66',message:'getZoningRulesForZone - pool is null',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return null;
  }

  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'zoningDb.ts:70',message:'Executing query',data:{city:input.city,zone_code:input.zone_code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'zoningDb.ts:92',message:'Query result',data:{rowCount:result.rows.length,hasRow:!!result.rows[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const row = result.rows[0];
    if (!row) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'zoningDb.ts:95',message:'No row found',data:{city:input.city,zone_code:input.zone_code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return null;
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'zoningDb.ts:99',message:'Row found, returning data',data:{zone_code:row.zone_code,hasPermittedUses:!!row.permitted_uses,permittedUsesCount:Array.isArray(row.permitted_uses)?row.permitted_uses.length:0,hasHeight:!!row.max_height_ft},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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
  } catch (e: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'zoningDb.ts:113',message:'Query error',data:{error:String(e?.message),errorCode:e?.code,errorStack:e?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw e;
  }
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
