import { getPool } from "@/lib/db/pool";

export type TripwireRow = {
  check_name: string;
  requirement: string;
  code_reference: string;
  common_issue: string;
  city: string | null;
  check_logic: any;
};

export async function getTripwires(input: {
  city: string;
  occupancy_type: string;
}): Promise<TripwireRow[] | null> {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT DISTINCT ON (check_name)
      check_name,
      requirement,
      code_reference,
      common_issue,
      city,
      check_logic
    FROM code_tripwires
    WHERE occupancy_type = $1
      AND (city = $2 OR city IS NULL)
    ORDER BY check_name, (city IS NULL) ASC
    `,
    [input.occupancy_type, input.city]
  );
  return result.rows.map((row) => ({
    check_name: String(row.check_name),
    requirement: String(row.requirement),
    code_reference: String(row.code_reference),
    common_issue: String(row.common_issue),
    city: row.city ? String(row.city) : null,
    check_logic: row.check_logic ?? {}
  }));
}
