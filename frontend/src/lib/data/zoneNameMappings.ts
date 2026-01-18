/**
 * Zone Name Mappings for SEO and Display
 *
 * This file provides human-readable zone names for each city's zoning codes.
 * Zone codes from municipal data often have cryptic abbreviations; this mapping
 * converts them to user-friendly descriptions.
 *
 * IMPORTANT: This is the Single Source of Logic (SSL) for zone name display.
 * All components should use these mappings rather than raw database values.
 */

import type { City } from "@/lib/cities";

export type ZoneNameMapping = {
  pattern: RegExp | string;
  name: string;
  category: "commercial" | "residential" | "industrial" | "mixed" | "downtown" | "special";
};

/**
 * Seattle Zone Name Mappings
 * Seattle uses descriptive codes like NC3-65 (Neighborhood Commercial 3, 65ft height)
 */
export const SeattleZoneMappings: ZoneNameMapping[] = [
  // Downtown zones
  { pattern: /^DOC/i, name: "Downtown Office Core", category: "downtown" },
  { pattern: /^DRC/i, name: "Downtown Retail Core", category: "downtown" },
  { pattern: /^DMC/i, name: "Downtown Mixed Commercial", category: "downtown" },
  { pattern: /^DMR/i, name: "Downtown Mixed Residential", category: "downtown" },
  { pattern: /^DH1/i, name: "Downtown Harborfront 1", category: "downtown" },
  { pattern: /^DH2/i, name: "Downtown Harborfront 2", category: "downtown" },
  // Commercial zones
  { pattern: /^C1P?-/i, name: "Commercial 1", category: "commercial" },
  { pattern: /^C2P?-/i, name: "Commercial 2", category: "commercial" },
  // Neighborhood Commercial
  { pattern: /^NC1P?-/i, name: "Neighborhood Commercial 1", category: "commercial" },
  { pattern: /^NC2P?-/i, name: "Neighborhood Commercial 2", category: "commercial" },
  { pattern: /^NC3P?-/i, name: "Neighborhood Commercial 3", category: "commercial" },
  // Industrial
  { pattern: /^IC-/i, name: "Industrial Commercial", category: "industrial" },
  { pattern: /^IB/i, name: "Industrial Buffer", category: "industrial" },
  { pattern: /^IG1/i, name: "General Industrial 1", category: "industrial" },
  { pattern: /^IG2/i, name: "General Industrial 2", category: "industrial" },
  // Residential
  { pattern: /^LR1/i, name: "Lowrise 1", category: "residential" },
  { pattern: /^LR2/i, name: "Lowrise 2", category: "residential" },
  { pattern: /^LR3/i, name: "Lowrise 3", category: "residential" },
  { pattern: /^MR-?/i, name: "Midrise", category: "residential" },
  { pattern: /^HR/i, name: "Highrise", category: "residential" },
  { pattern: /^SF/i, name: "Single Family", category: "residential" },
  { pattern: /^RSL/i, name: "Residential Small Lot", category: "residential" },
  // Special districts
  { pattern: /^MIO-/i, name: "Major Institution Overlay", category: "special" },
  { pattern: /^IDM/i, name: "International District Mixed", category: "mixed" },
  { pattern: /^IDR/i, name: "International District Residential", category: "residential" },
  { pattern: /^PSM/i, name: "Pioneer Square Mixed", category: "mixed" },
  { pattern: /^PMM/i, name: "Pike Market Mixed", category: "mixed" },
  { pattern: /^MPC/i, name: "Master Planned Community", category: "special" },
  { pattern: /^SM-?U?/i, name: "Seattle Mixed", category: "mixed" },
];

/**
 * Austin Zone Name Mappings
 * Austin uses abbreviated codes like CS (Commercial Services), CBD (Central Business District)
 */
export const AustinZoneMappings: ZoneNameMapping[] = [
  // Commercial zones
  { pattern: /^CBD/i, name: "Central Business District", category: "downtown" },
  { pattern: /^DMU/i, name: "Downtown Mixed Use", category: "downtown" },
  { pattern: /^CS-1/i, name: "Commercial Services 1", category: "commercial" },
  { pattern: /^CS(?!-1)/i, name: "Commercial Services", category: "commercial" },
  { pattern: /^CR/i, name: "Commercial Recreation", category: "commercial" },
  { pattern: /^CH/i, name: "Commercial Highway", category: "commercial" },
  { pattern: /^GR/i, name: "Community Commercial", category: "commercial" },
  { pattern: /^LR/i, name: "Neighborhood Commercial", category: "commercial" },
  { pattern: /^LO/i, name: "Limited Office", category: "commercial" },
  { pattern: /^GO/i, name: "General Office", category: "commercial" },
  { pattern: /^NO/i, name: "Neighborhood Office", category: "commercial" },
  // Residential
  { pattern: /^MF-[1-4]/i, name: "Multifamily Residence", category: "residential" },
  { pattern: /^MF-[5-6]/i, name: "Multifamily Residence High Density", category: "residential" },
  { pattern: /^SF-/i, name: "Single Family", category: "residential" },
  { pattern: /^MH/i, name: "Mobile Home", category: "residential" },
  // Industrial
  { pattern: /^LI/i, name: "Limited Industrial", category: "industrial" },
  { pattern: /^MI/i, name: "Major Industrial", category: "industrial" },
  { pattern: /^IP/i, name: "Industrial Park", category: "industrial" },
  { pattern: /^W\/LO/i, name: "Warehouse Limited Office", category: "industrial" },
  // Mixed/Special
  { pattern: /^DR/i, name: "Development Reserve", category: "special" },
  { pattern: /^ERC/i, name: "East Riverside Corridor", category: "special" },
  { pattern: /^TOD/i, name: "Transit Oriented Development", category: "mixed" },
  { pattern: /^PUD/i, name: "Planned Unit Development", category: "special" },
  { pattern: /^AG/i, name: "Agricultural", category: "special" },
  { pattern: /^AV/i, name: "Aviation", category: "special" },
  { pattern: /^P(?:-|$)/i, name: "Public", category: "special" },
];

/**
 * Chicago Zone Name Mappings
 * Chicago uses codes like B3-2 (Business 3, intensity 2), DX-12 (Downtown Mixed, 12 FAR)
 */
export const ChicagoZoneMappings: ZoneNameMapping[] = [
  // Business/Commercial
  { pattern: /^B1-/i, name: "Neighborhood Shopping", category: "commercial" },
  { pattern: /^B2-/i, name: "Neighborhood Mixed-Use", category: "commercial" },
  { pattern: /^B3-/i, name: "Community Shopping", category: "commercial" },
  // Commercial
  { pattern: /^C1-/i, name: "Neighborhood Commercial", category: "commercial" },
  { pattern: /^C2-/i, name: "Motor Vehicle-Related Commercial", category: "commercial" },
  { pattern: /^C3-/i, name: "Commercial, Manufacturing, and Employment", category: "commercial" },
  // Downtown
  { pattern: /^DC-/i, name: "Downtown Core", category: "downtown" },
  { pattern: /^DR-/i, name: "Downtown Residential", category: "downtown" },
  { pattern: /^DS-/i, name: "Downtown Service", category: "downtown" },
  { pattern: /^DX-/i, name: "Downtown Mixed-Use", category: "downtown" },
  // Manufacturing
  { pattern: /^M1-/i, name: "Limited Manufacturing/Business Park", category: "industrial" },
  { pattern: /^M2-/i, name: "Light Industry", category: "industrial" },
  { pattern: /^M3-/i, name: "Heavy Industry", category: "industrial" },
  // Residential
  { pattern: /^RS-/i, name: "Residential Single-Unit", category: "residential" },
  { pattern: /^RT-/i, name: "Residential Two-Flat, Townhouse", category: "residential" },
  { pattern: /^RM-/i, name: "Residential Multi-Unit", category: "residential" },
  // Planned Development
  { pattern: /^PD\s*\d+/i, name: "Planned Development", category: "special" },
  { pattern: /^PD$/i, name: "Planned Development", category: "special" },
  // Parks/Open Space
  { pattern: /^POS-/i, name: "Parks and Open Space", category: "special" },
  // Transportation
  { pattern: /^T/i, name: "Transportation", category: "special" },
];

/**
 * Get zone name for a given city and zone code
 */
export function getZoneDisplayName(city: City, zoneCode: string): string {
  const mappings = getZoneMappingsForCity(city);
  const code = zoneCode.trim();

  for (const mapping of mappings) {
    if (typeof mapping.pattern === "string") {
      if (code.toUpperCase() === mapping.pattern.toUpperCase()) {
        return formatZoneName(mapping.name, code);
      }
    } else if (mapping.pattern.test(code)) {
      return formatZoneName(mapping.name, code);
    }
  }

  // Fallback: Return the code itself with basic formatting
  return formatUnknownZoneCode(city, code);
}

/**
 * Get zone category for display/filtering
 */
export function getZoneCategory(city: City, zoneCode: string): ZoneNameMapping["category"] | "unknown" {
  const mappings = getZoneMappingsForCity(city);
  const code = zoneCode.trim();

  for (const mapping of mappings) {
    if (typeof mapping.pattern === "string") {
      if (code.toUpperCase() === mapping.pattern.toUpperCase()) {
        return mapping.category;
      }
    } else if (mapping.pattern.test(code)) {
      return mapping.category;
    }
  }

  return "unknown";
}

function getZoneMappingsForCity(city: City): ZoneNameMapping[] {
  switch (city) {
    case "seattle":
      return SeattleZoneMappings;
    case "austin":
      return AustinZoneMappings;
    case "chicago":
      return ChicagoZoneMappings;
    default:
      return [];
  }
}

/**
 * Format the zone name with any suffix details from the code
 */
function formatZoneName(baseName: string, code: string): string {
  // Extract height suffix if present (e.g., NC3-65 -> 65ft)
  const heightMatch = code.match(/-(\d+)(?:\s|$|\()/);
  if (heightMatch) {
    const height = heightMatch[1];
    // Check if it looks like a height (typically 30-500 ft range)
    const heightNum = parseInt(height, 10);
    if (heightNum >= 20 && heightNum <= 600) {
      return `${baseName} (${height}')`;
    }
  }

  // Extract incentive suffix if present (e.g., NC3-65 (1.3) -> with Incentive)
  const incentiveMatch = code.match(/\([\d.]+\)$/);
  if (incentiveMatch) {
    return `${baseName} Incentive`;
  }

  // Extract suffix modifiers
  const suffixes: string[] = [];
  if (/-MU/i.test(code)) suffixes.push("Mixed Use");
  if (/-V/i.test(code)) suffixes.push("Vertical Mixed Use");
  if (/-CO/i.test(code)) suffixes.push("Conditional Overlay");
  if (/-NP/i.test(code)) suffixes.push("Neighborhood Plan");
  if (/-H(?:-|$)/i.test(code)) suffixes.push("Historic");
  if (/-PUD/i.test(code)) suffixes.push("PUD");
  if (/\bRC\b/i.test(code)) suffixes.push("Residential Commercial");

  if (suffixes.length > 0) {
    return `${baseName} - ${suffixes.join(", ")}`;
  }

  return baseName;
}

/**
 * Format an unknown zone code with basic parsing
 */
function formatUnknownZoneCode(city: City, code: string): string {
  // Try to make the code more readable
  const cleanCode = code.trim().toUpperCase();

  // If it's mostly letters, capitalize properly
  if (/^[A-Z-]+$/.test(cleanCode)) {
    return cleanCode;
  }

  // Return as-is for codes with numbers
  return cleanCode;
}

/**
 * Bulk process zone codes for a city
 */
export function enrichZoneIndex(
  city: City,
  zones: Array<{ zone_code: string; zone_name: string }>
): Array<{ zone_code: string; zone_name: string; category: string }> {
  return zones.map((zone) => {
    const displayName = getZoneDisplayName(city, zone.zone_code);
    // Use database zone_name if it's informative, otherwise use our mapping
    const name = isInformativeZoneName(zone.zone_name) ? zone.zone_name : displayName;
    return {
      zone_code: zone.zone_code,
      zone_name: name,
      category: getZoneCategory(city, zone.zone_code),
    };
  });
}

/**
 * Check if a zone name from the database is informative (not just a number or empty)
 */
function isInformativeZoneName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  // If it's just a number, it's not informative
  if (/^\d+$/.test(trimmed)) return false;
  // If it's very short (1-2 chars), it's probably just a code repeat
  if (trimmed.length <= 2) return false;
  return true;
}
