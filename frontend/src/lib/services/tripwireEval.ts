import type { TripwireStatus } from "@/lib/mock/tripwires";
import type { TripwireRow } from "@/lib/services/tripwiresDb";

export type TripwireInputs = {
  corridor_width_in?: number;
};

function statusFromThresholds(value: number, thresholds: any): TripwireStatus {
  const passExpr = thresholds?.pass;
  const warningExpr = thresholds?.warning;
  const failExpr = thresholds?.fail;

  // Minimal parser for expressions like ">= 44", "42-43", "< 42"
  const parseRange = (expr: string) => {
    const trimmed = expr.trim();
    const m = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    return { min: Number(m[1]), max: Number(m[2]) };
  };

  const parseCmp = (expr: string) => {
    const trimmed = expr.trim();
    const m = trimmed.match(/^(>=|<=|>|<)\s*(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    return { op: m[1], n: Number(m[2]) };
  };

  const matches = (expr: string) => {
    const r = parseRange(expr);
    if (r) return value >= r.min && value <= r.max;
    const c = parseCmp(expr);
    if (!c) return false;
    if (c.op === ">=") return value >= c.n;
    if (c.op === "<=") return value <= c.n;
    if (c.op === ">") return value > c.n;
    if (c.op === "<") return value < c.n;
    return false;
  };

  if (typeof passExpr === "string" && matches(passExpr)) return "Pass";
  if (typeof failExpr === "string" && matches(failExpr)) return "Likely Issue";
  if (typeof warningExpr === "string" && matches(warningExpr)) return "Likely Issue";
  return "Unknown";
}

export function evaluateTripwires(rows: TripwireRow[], inputs: TripwireInputs) {
  const byName = new Map(rows.map((r) => [r.check_name, r]));

  const getStatus = (checkName: string): TripwireStatus => {
    if (checkName === "corridor_width") {
      const value = inputs.corridor_width_in;
      if (value === undefined || value === null) return "Not Checked";
      const row = byName.get(checkName);
      const thresholds = row?.check_logic?.thresholds ?? row?.check_logic?.check_logic?.thresholds;
      if (thresholds) return statusFromThresholds(Number(value), thresholds);
      // fallback thresholds per spec template
      if (value >= 44) return "Pass";
      if (value >= 42) return "Likely Issue";
      return "Likely Issue";
    }

    return "Not Checked";
  };

  return { getStatus };
}

