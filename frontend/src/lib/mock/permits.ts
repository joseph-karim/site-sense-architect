/**
 * DEPRECATED: Mock Permit Data
 *
 * This file previously contained fake/mock permit timeline data used as fallback.
 * It has been replaced by the SSL (Single Source of Logic) data service.
 *
 * DO NOT USE THIS FILE FOR NEW CODE.
 * Use `@/lib/data/entitlementDataService` instead.
 *
 * This file now returns empty "unavailable" states to make it clear
 * when real data is missing.
 */

import type { City } from "@/lib/cities";

export type PermitPathwayOutput = {
  required_permits: string[];
  review_sequence: string[];
  departments: string[];
  timeline_ranges: { p50_days: number | null; p90_days: number | null; note: string };
  common_delays: string[];
  gating_items: string[];
};

/**
 * Returns an unavailable permit pathway.
 * This function is called when database data is not available.
 *
 * @deprecated Use getPermitPathway from @/lib/data/entitlementDataService instead
 */
export function mockPermitPathway(city: City, projectType: string): PermitPathwayOutput {
  // Return a clear "data unavailable" state with null timelines - NOT fake numbers
  return {
    required_permits: ["Building", "Mechanical", "Electrical", "Plumbing", "Fire"],
    review_sequence: ["Intake", "Plan Review", "Corrections", "Permit Issuance"],
    departments: ["Planning", "Building", "Fire"],
    timeline_ranges: {
      p50_days: null,
      p90_days: null,
      note: `Permit timeline data not available for ${projectType} in ${city}. Contact the local building department for estimates.`
    },
    common_delays: [],
    gating_items: ["Corrections must be resolved before permit issuance"]
  };
}

