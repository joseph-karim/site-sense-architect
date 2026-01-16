import { Cities } from "@/lib/cities";

// Commercial + institutional only (site-wide scope).
export const UseTypes = ["office", "retail", "mixed-use", "healthcare", "education", "civic"] as const;
export const ProjectTypes = ["new-construction", "tenant-improvement", "addition", "change-of-use"] as const;
export const ToolSlugs = [
  "corridor-width-checker",
  "egress-travel-distance-checker",
  "exit-separation-checker",
  "ada-door-clearance-checker",
  "stair-geometry-checker",
  "fire-separation-checker",
  "occupant-load-checker",
  "plumbing-fixture-count-checker",
  "shaft-enclosure-checker",
  "exterior-wall-openings-checker"
] as const;

export const SampleZonesByCity: Record<(typeof Cities)[number], string[]> = {
  seattle: ["NC3-65", "LR3", "SM-U"],
  austin: ["CS", "CBD", "GO"],
  chicago: ["B3-2", "C1-2", "DX-12"]
};

export const CommercialToolSlugs = [
  "commercial-zoning-snapshot",
  "commercial-permit-pathway",
  "commercial-risk-register"
] as const;
