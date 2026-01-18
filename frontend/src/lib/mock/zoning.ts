/**
 * DEPRECATED: Mock Zoning Data
 *
 * This file previously contained fake/mock zoning data used as fallback.
 * It has been replaced by the SSL (Single Source of Logic) data service.
 *
 * DO NOT USE THIS FILE FOR NEW CODE.
 * Use `@/lib/data/entitlementDataService` instead.
 *
 * This file now returns empty "unavailable" states to make it clear
 * when real data is missing.
 */

import type { City } from "@/lib/cities";
import { getZoneDisplayName } from "@/lib/data/zoneNameMappings";

export type ZoningSnapshotOutput = {
  zoning_district: { zone_code: string; zone_name: string; ordinance_url: string };
  allowed_uses: { permitted: string[]; conditional: string[]; prohibited: string[] };
  height_limit: { max_height_ft: number | null; max_height_stories: number | null };
  far: number | null;
  lot_coverage_pct: number | null;
  setbacks_ft: { front: number | null; side: number | null; rear: number | null };
  parking: { summary: string; reductions: string[] };
  overlay_flags: string[];
  red_flags: string[];
  data_freshness: { sources: string[]; last_updated: string };
  disclaimer: string;
};

/**
 * Returns an unavailable zoning snapshot.
 * This function is called when database data is not available.
 *
 * @deprecated Use getZoningSnapshot from @/lib/data/entitlementDataService instead
 */
export function mockZoningSnapshot(city: City, _useType: string): ZoningSnapshotOutput {
  // Return a clear "data unavailable" state - NOT fake data
  return {
    zoning_district: {
      zone_code: "UNAVAILABLE",
      zone_name: "Zoning Data Not Available",
      ordinance_url: ""
    },
    allowed_uses: {
      permitted: [],
      conditional: [],
      prohibited: []
    },
    height_limit: { max_height_ft: null, max_height_stories: null },
    far: null,
    lot_coverage_pct: null,
    setbacks_ft: { front: null, side: null, rear: null },
    parking: {
      summary: `Zoning data not available for ${city}. Contact the local planning department for accurate information.`,
      reductions: []
    },
    overlay_flags: [],
    red_flags: ["Zoning data is not available - verify with local planning department"],
    data_freshness: {
      sources: [],
      last_updated: new Date().toISOString().slice(0, 10)
    },
    disclaimer:
      "Zoning data not available. This is not a substitute for consulting the local planning department."
  };
}
