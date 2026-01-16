import { getPool } from "@/lib/db/pool";

export type PermitStatRow = {
  permit_type: string;
  p50_days: number;
  p90_days: number;
  sample_size: number;
  common_delays: string[];
  last_calculated: string;
};

export async function getPermitStats(input: {
  city: string;
  project_type: string;
}): Promise<PermitStatRow[] | null> {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT permit_type, p50_days, p90_days, sample_size, common_delays, last_calculated
    FROM permit_stats
    WHERE city = $1
      AND (project_type = $2 OR project_type = 'unknown')
    ORDER BY
      (project_type = $2) DESC,
      sample_size DESC,
      permit_type ASC
    `,
    [input.city, input.project_type]
  );
  if (result.rows.length === 0) {
    const fallback = await pool.query(
      `
      SELECT permit_type, p50_days, p90_days, sample_size, common_delays, last_calculated
      FROM permit_stats
      WHERE city = $1
      ORDER BY sample_size DESC, permit_type ASC
      `,
      [input.city]
    );
    return fallback.rows.map((row) => ({
      permit_type: String(row.permit_type),
      p50_days: Number(row.p50_days),
      p90_days: Number(row.p90_days),
      sample_size: Number(row.sample_size),
      common_delays: row.common_delays ?? [],
      last_calculated: new Date(row.last_calculated).toISOString().slice(0, 10)
    }));
  }

  return result.rows.map((row) => ({
    permit_type: String(row.permit_type),
    p50_days: Number(row.p50_days),
    p90_days: Number(row.p90_days),
    sample_size: Number(row.sample_size),
    common_delays: row.common_delays ?? [],
    last_calculated: new Date(row.last_calculated).toISOString().slice(0, 10)
  }));
}
