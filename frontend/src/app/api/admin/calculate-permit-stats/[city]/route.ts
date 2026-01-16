import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { isCity } from "@/lib/cities";
import { getPool } from "@/lib/db/pool";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, context: { params: Promise<{ city: string }> }) {
  const params = await context.params;
  const city = params.city.toLowerCase();
  if (!isCity(city)) return jsonError("Unsupported city", 400);

  const pool = getPool();
  if (!pool) return jsonError("DATABASE_URL not configured", 400);

  // Minimal implementation: aggregate processing_days into p50/p90 by project_type + permit_type.
  await pool.query(
    `
    INSERT INTO permit_stats (city, project_type, permit_type, p50_days, p90_days, sample_size, last_calculated)
    SELECT
      city,
      COALESCE(project_type, 'unknown') AS project_type,
      permit_type,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY processing_days) ::int AS p50_days,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY processing_days) ::int AS p90_days,
      COUNT(*)::int AS sample_size,
      CURRENT_DATE AS last_calculated
    FROM permits
    WHERE city = $1
      AND processing_days IS NOT NULL
    GROUP BY city, COALESCE(project_type, 'unknown'), permit_type
    ON CONFLICT (city, project_type, permit_type) DO UPDATE SET
      p50_days = EXCLUDED.p50_days,
      p90_days = EXCLUDED.p90_days,
      sample_size = EXCLUDED.sample_size,
      last_calculated = EXCLUDED.last_calculated
    `,
    [city]
  );

  return jsonOk({ status: "ok", job: "calculate-permit-stats", city });
}

