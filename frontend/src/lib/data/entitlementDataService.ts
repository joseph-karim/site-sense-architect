/**
 * Entitlement Data Service - Single Source of Logic (SSL)
 *
 * This service is the central data layer for all entitlement-related data:
 * - Zoning rules and districts
 * - Permit statistics
 * - Building code tripwires
 *
 * ARCHITECTURE PRINCIPLE:
 * - All data flows through this service
 * - Returns actual database data or explicit empty/unavailable states
 * - NO fake/mock data is generated
 * - Graceful handling of missing data with clear indicators
 */

import type { City } from "@/lib/cities";
import { getPool } from "@/lib/db/pool";
import { getZoneDisplayName, getZoneCategory, enrichZoneIndex } from "@/lib/data/zoneNameMappings";
import {
  findZoningDistrictByPoint,
  getZoningRulesForZone,
  getZoningDistrictByCode,
  type ZoningDistrictRow,
  type ZoningRuleRow,
} from "@/lib/services/zoningDb";
import { getPermitStats, type PermitStatRow } from "@/lib/services/permitsDb";
import { getTripwires } from "@/lib/services/tripwiresDb";
import { TripwireDefinitions } from "@/lib/services/tripwireDefinitions";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DataAvailability = "available" | "partial" | "unavailable";

export type ZoningSnapshotData = {
  availability: DataAvailability;
  zoning_district: {
    zone_code: string;
    zone_name: string;
    ordinance_url: string;
  } | null;
  allowed_uses: {
    permitted: string[];
    conditional: string[];
    prohibited: string[];
  };
  selected_use?: {
    use_type: string;
    status: "permitted" | "conditional" | "prohibited" | "unknown";
  };
  height_limit: {
    max_height_ft: number | null;
    max_height_stories: number | null;
  };
  far: number | null;
  lot_coverage_pct: number | null;
  setbacks_ft: {
    front: number | null;
    side: number | null;
    rear: number | null;
  };
  parking: {
    summary: string;
    reductions: string[];
  };
  overlay_flags: string[];
  red_flags: string[];
  data_freshness: {
    sources: string[];
    last_updated: string | null;
  };
  disclaimer: string;
};

export type PermitPathwayData = {
  availability: DataAvailability;
  required_permits: string[];
  review_sequence: string[];
  departments: string[];
  timeline_ranges: {
    p50_days: number | null;
    p90_days: number | null;
    note: string;
  };
  common_delays: string[];
  gating_items: string[];
  data_freshness: {
    sample_size: number;
    last_calculated: string | null;
  };
};

export type TripwireChecklistData = {
  availability: DataAvailability;
  checklist: Array<{
    check_name: string;
    label: string;
    why_it_matters: string;
    code_reference: string;
    requirement: string;
    common_issue: string;
    status: "Pass" | "Likely Issue" | "Unknown" | "Not Checked";
  }>;
  disclaimer: string;
};

export type ZoneListItem = {
  zone_code: string;
  zone_name: string;
  category: string;
};

// ============================================================================
// CORE DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get zoning snapshot data for a location
 * This is the primary function for zoning lookups
 */
export async function getZoningSnapshot(input: {
  city: City;
  lat: number;
  lng: number;
  use_type?: string;
}): Promise<ZoningSnapshotData> {
  const { city, lat, lng, use_type } = input;

  // Try to find the zoning district by coordinates
  let district: ZoningDistrictRow | null = null;
  let rules: ZoningRuleRow | null = null;

  try {
    district = await findZoningDistrictByPoint({ city, lat, lng });
  } catch (e: unknown) {
    console.warn("Zoning district lookup failed:", e);
  }

  if (district) {
    try {
      rules = await getZoningRulesForZone({ city, zone_code: district.zone_code });
    } catch (e: unknown) {
      console.warn("Zoning rules lookup failed:", e);
    }
  }

  return buildZoningSnapshotResponse(city, district, rules, use_type);
}

/**
 * Get zoning data by zone code (for SEO pages)
 */
export async function getZoningByCode(input: {
  city: City;
  zone_code: string;
  use_type?: string;
}): Promise<ZoningSnapshotData> {
  const { city, zone_code, use_type } = input;

  let district: ZoningDistrictRow | null = null;
  let rules: ZoningRuleRow | null = null;

  try {
    district = await getZoningDistrictByCode({ city, zone_code });
  } catch (e: unknown) {
    console.warn("Zoning district lookup failed:", e);
  }

  try {
    rules = await getZoningRulesForZone({ city, zone_code });
  } catch (e: unknown) {
    console.warn("Zoning rules lookup failed:", e);
  }

  // If no district found, create a minimal one from the zone code
  if (!district && rules) {
    district = {
      zone_code,
      zone_name: getZoneDisplayName(city, zone_code),
      properties: {},
      source_url: rules.source_url,
      last_updated: new Date().toISOString().slice(0, 10),
    };
  } else if (!district) {
    // Create placeholder district for display
    district = {
      zone_code,
      zone_name: getZoneDisplayName(city, zone_code),
      properties: {},
      source_url: "",
      last_updated: new Date().toISOString().slice(0, 10),
    };
  }

  return buildZoningSnapshotResponse(city, district, rules, use_type);
}

/**
 * Get permit pathway data for a city and project type
 */
export async function getPermitPathway(input: {
  city: City;
  project_type: string;
}): Promise<PermitPathwayData> {
  const { city, project_type } = input;

  let stats: PermitStatRow[] | null = null;
  try {
    stats = await getPermitStats({ city, project_type });
  } catch (e: unknown) {
    console.warn("Permit stats lookup failed:", e);
  }

  if (stats && stats.length > 0) {
    const totalSamples = stats.reduce((a, s) => a + s.sample_size, 0);
    const maxP50 = Math.max(...stats.map((s) => s.p50_days));
    const maxP90 = Math.max(...stats.map((s) => s.p90_days));
    const delays = Array.from(new Set(stats.flatMap((s) => s.common_delays ?? []))).slice(0, 5);
    const lastCalc = stats[0]?.last_calculated || null;

    return {
      availability: "available",
      required_permits: ["Building", "Mechanical", "Electrical", "Plumbing", "Fire"],
      review_sequence: ["Intake", "Plan Review", "Corrections", "Permit Issuance"],
      departments: ["Planning", "Building", "Fire"],
      timeline_ranges: {
        p50_days: maxP50,
        p90_days: maxP90,
        note: `Calculated from ${totalSamples} permits in ${city}`,
      },
      common_delays: delays,
      gating_items: ["Corrections must be resolved before permit issuance"],
      data_freshness: {
        sample_size: totalSamples,
        last_calculated: lastCalc,
      },
    };
  }

  // Return unavailable state - NO fake data
  return {
    availability: "unavailable",
    required_permits: ["Building", "Mechanical", "Electrical", "Plumbing", "Fire"],
    review_sequence: ["Intake", "Plan Review", "Corrections", "Permit Issuance"],
    departments: ["Planning", "Building", "Fire"],
    timeline_ranges: {
      p50_days: null,
      p90_days: null,
      note: `No permit data available for ${project_type} projects in ${city}. Contact the local building department for estimates.`,
    },
    common_delays: [],
    gating_items: ["Corrections must be resolved before permit issuance"],
    data_freshness: {
      sample_size: 0,
      last_calculated: null,
    },
  };
}

/**
 * Get tripwire checklist for building code compliance
 */
export async function getTripwireChecklist(input: {
  city: City;
  occupancy_type: string;
}): Promise<TripwireChecklistData> {
  const { city, occupancy_type } = input;

  let dbTripwires: Awaited<ReturnType<typeof getTripwires>> = null;
  try {
    dbTripwires = await getTripwires({ city, occupancy_type });
  } catch (e: unknown) {
    console.warn("Tripwires lookup failed:", e);
  }

  const byName = new Map((dbTripwires ?? []).map((r) => [r.check_name, r]));

  // Merge database tripwires with definitions
  const checklist = TripwireDefinitions.map((t) => {
    const row = byName.get(t.check_name);
    return {
      check_name: t.check_name,
      label: t.label,
      why_it_matters: t.why,
      code_reference: row?.code_reference ?? t.ref,
      requirement: row?.requirement ?? "",
      common_issue: row?.common_issue ?? "",
      status: "Not Checked" as const,
    };
  });

  const hasDbData = dbTripwires && dbTripwires.length > 0;

  return {
    availability: hasDbData ? "available" : "partial",
    checklist,
    disclaimer:
      "This checklist highlights common issues only. It is not a substitute for professional plan review. Consult a licensed architect.",
  };
}

/**
 * Get list of zones for a city (for SEO index pages)
 */
export async function getZoneListForCity(city: City): Promise<ZoneListItem[]> {
  const pool = getPool();
  if (!pool) return [];

  try {
    const result = await pool.query(
      `
      SELECT DISTINCT zone_code, MAX(zone_name) as zone_name
      FROM zoning_districts
      WHERE city = $1
      GROUP BY zone_code
      ORDER BY zone_code ASC
      `,
      [city]
    );

    const rawZones = result.rows.map((row) => ({
      zone_code: String(row.zone_code),
      zone_name: String(row.zone_name ?? row.zone_code),
    }));

    // Enrich with proper zone names from our mapping
    return enrichZoneIndex(city, rawZones);
  } catch (e: unknown) {
    console.error("Error fetching zone list:", e);
    return [];
  }
}

/**
 * Check if database is configured and has data for a city
 */
export async function checkDataAvailability(city: City): Promise<{
  database: boolean;
  zoning_districts: boolean;
  zoning_rules: boolean;
  permit_stats: boolean;
  tripwires: boolean;
}> {
  const pool = getPool();
  if (!pool) {
    return {
      database: false,
      zoning_districts: false,
      zoning_rules: false,
      permit_stats: false,
      tripwires: false,
    };
  }

  const results = {
    database: true,
    zoning_districts: false,
    zoning_rules: false,
    permit_stats: false,
    tripwires: false,
  };

  try {
    const [districts, rules, permits, tripwires] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM zoning_districts WHERE city = $1", [city]),
      pool.query("SELECT COUNT(*) FROM zoning_rules WHERE city = $1", [city]),
      pool.query("SELECT COUNT(*) FROM permit_stats WHERE city = $1", [city]),
      pool.query("SELECT COUNT(*) FROM code_tripwires WHERE city = $1 OR city IS NULL", [city]),
    ]);

    results.zoning_districts = parseInt(districts.rows[0].count, 10) > 0;
    results.zoning_rules = parseInt(rules.rows[0].count, 10) > 0;
    results.permit_stats = parseInt(permits.rows[0].count, 10) > 0;
    results.tripwires = parseInt(tripwires.rows[0].count, 10) > 0;
  } catch (e: unknown) {
    console.error("Error checking data availability:", e);
  }

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildZoningSnapshotResponse(
  city: City,
  district: ZoningDistrictRow | null,
  rules: ZoningRuleRow | null,
  use_type?: string
): ZoningSnapshotData {
  // Determine availability level
  let availability: DataAvailability = "unavailable";
  if (district && rules) {
    availability = "available";
  } else if (district || rules) {
    availability = "partial";
  }

  // Build response based on available data
  if (district && rules) {
    // Full data available
    const useStatus = use_type
      ? rules.permitted_uses?.includes(use_type)
        ? "permitted"
        : rules.conditional_uses?.includes(use_type)
          ? "conditional"
          : rules.prohibited_uses?.includes(use_type)
            ? "prohibited"
            : "unknown"
      : undefined;

    return {
      availability,
      zoning_district: {
        zone_code: district.zone_code,
        zone_name: district.zone_name || getZoneDisplayName(city, district.zone_code),
        ordinance_url: rules.source_url || district.source_url,
      },
      allowed_uses: {
        permitted: rules.permitted_uses ?? [],
        conditional: rules.conditional_uses ?? [],
        prohibited: rules.prohibited_uses ?? [],
      },
      selected_use: use_type
        ? {
            use_type,
            status: useStatus as "permitted" | "conditional" | "prohibited" | "unknown",
          }
        : undefined,
      height_limit: {
        max_height_ft: rules.max_height_ft,
        max_height_stories: rules.max_height_stories,
      },
      far: rules.far,
      lot_coverage_pct: rules.lot_coverage_pct,
      setbacks_ft: {
        front: rules.setback_front_ft,
        side: rules.setback_side_ft,
        rear: rules.setback_rear_ft,
      },
      parking: {
        summary:
          (use_type && rules.parking_rules?.[use_type]) ||
          rules.parking_rules?.summary ||
          "Verify parking requirements with local code.",
        reductions: rules.parking_rules?.reductions ?? [],
      },
      overlay_flags: rules.overlays ?? [],
      red_flags: rules.red_flags ?? [],
      data_freshness: {
        sources: [district.source_url, rules.source_url].filter(Boolean),
        last_updated: district.last_updated,
      },
      disclaimer:
        "This summary is for informational purposes only. Verify all constraints with the local planning department.",
    };
  }

  if (district) {
    // District found but no rules
    return {
      availability,
      zoning_district: {
        zone_code: district.zone_code,
        zone_name: district.zone_name || getZoneDisplayName(city, district.zone_code),
        ordinance_url: district.source_url,
      },
      allowed_uses: { permitted: [], conditional: [], prohibited: [] },
      height_limit: { max_height_ft: null, max_height_stories: null },
      far: null,
      lot_coverage_pct: null,
      setbacks_ft: { front: null, side: null, rear: null },
      parking: { summary: "Verify parking requirements with local code.", reductions: [] },
      overlay_flags: [],
      red_flags: [],
      data_freshness: {
        sources: [district.source_url].filter(Boolean),
        last_updated: district.last_updated,
      },
      disclaimer:
        "Zone identified but detailed rules are not yet curated. Verify all constraints with the local planning department.",
    };
  }

  // No data available
  return {
    availability: "unavailable",
    zoning_district: null,
    allowed_uses: { permitted: [], conditional: [], prohibited: [] },
    height_limit: { max_height_ft: null, max_height_stories: null },
    far: null,
    lot_coverage_pct: null,
    setbacks_ft: { front: null, side: null, rear: null },
    parking: { summary: "Unable to determine parking requirements.", reductions: [] },
    overlay_flags: [],
    red_flags: [],
    data_freshness: {
      sources: [],
      last_updated: null,
    },
    disclaimer:
      "Zoning data not available for this location. Contact the local planning department for accurate information.",
  };
}
