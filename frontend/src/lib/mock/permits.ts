import type { City } from "@/lib/cities";

export type PermitPathwayOutput = {
  required_permits: string[];
  review_sequence: string[];
  departments: string[];
  timeline_ranges: { p50_days: number; p90_days: number; note: string };
  common_delays: string[];
  gating_items: string[];
};

export function mockPermitPathway(city: City, projectType: string): PermitPathwayOutput {
  const baseline = city === "seattle" ? { p50: 60, p90: 120 } : city === "austin" ? { p50: 45, p90: 90 } : { p50: 75, p90: 150 };
  return {
    required_permits: ["Building", "Mechanical", "Electrical", "Plumbing", "Fire"],
    review_sequence: ["Intake", "Plan Review", "Corrections", "Permit Issuance"],
    departments: ["Planning", "Building", "Fire"],
    timeline_ranges: {
      p50_days: baseline.p50,
      p90_days: baseline.p90,
      note: `Typical timeline for ${projectType} in ${city}`
    },
    common_delays: ["Incomplete drawings", "Egress clarification", "Zoning interpretation"],
    gating_items: ["You cannot proceed to permit issuance until corrections are resolved"]
  };
}

