import type { City } from "@/lib/cities";

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

export function mockZoningSnapshot(city: City, useType: string): ZoningSnapshotOutput {
  const zone_code = city === "seattle" ? "NC3-65" : city === "austin" ? "CS" : "B3-2";
  const zone_name =
    city === "seattle"
      ? "Neighborhood Commercial 3 (65')"
      : city === "austin"
        ? "Commercial Services"
        : "Community Shopping District";

  return {
    zoning_district: {
      zone_code,
      zone_name,
      ordinance_url: "https://example.com/ordinance"
    },
    allowed_uses: {
      permitted: ["office", "retail", "mixed-use"].filter(Boolean),
      conditional: ["education", "healthcare", "civic"],
      prohibited: ["residential-only"]
    },
    height_limit: { max_height_ft: city === "seattle" ? 65 : null, max_height_stories: null },
    far: city === "seattle" ? 4.5 : null,
    lot_coverage_pct: 85,
    setbacks_ft: { front: 0, side: 0, rear: 0 },
    parking: {
      summary: `Varies by use; verify "${useType}" requirements with local code.`,
      reductions: ["Transit overlay reductions may apply"]
    },
    overlay_flags: ["design_review"],
    red_flags: ["Design review adds 4–8 weeks", "Ground floor retail may be required"],
    data_freshness: {
      sources: ["Municipal ordinance", "City open data zoning layer"],
      last_updated: new Date().toISOString().slice(0, 10)
    },
    disclaimer:
      "This summary is for informational purposes only. Verify all constraints with the local planning department before proceeding."
  };
}
