import type { City } from "@/lib/cities";

function flattenDistinct(values: unknown[]): string[] {
  const out = new Set<string>();
  for (const v of values) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const x of v) out.add(String(x));
    } else {
      out.add(String(v));
    }
  }
  return [...out].map((s) => s.trim()).filter(Boolean);
}

function extractFromProperties(properties: any, key: string): string[] {
  if (!properties) return [];
  if (Array.isArray(properties)) {
    return flattenDistinct(properties.map((p) => p?.[key]));
  }
  return flattenDistinct([properties?.[key]]);
}

export function deriveOverlayFlags(city: City, properties: any): string[] {
  const flags = new Set<string>();

  if (city === "seattle") {
    const historic = extractFromProperties(properties, "HISTORIC");
    if (historic.length > 0) flags.add("historic");

    const overlay = extractFromProperties(properties, "OVERLAY");
    for (const v of overlay) flags.add(`overlay:${v}`);

    const shoreline = extractFromProperties(properties, "SHORELINE");
    if (shoreline.length > 0) flags.add("shoreline");

    const pedestrian = extractFromProperties(properties, "PEDESTRIAN");
    for (const v of pedestrian) flags.add(`pedestrian:${v}`);

    const village = extractFromProperties(properties, "VILLAGE");
    for (const v of village) flags.add(`village:${v}`);

    const mio = extractFromProperties(properties, "MIO");
    for (const v of mio) flags.add(`mio:${v}`);

    const lightRail = extractFromProperties(properties, "LIGHTRAIL");
    if (lightRail.length > 0) flags.add("light_rail");
  }

  if (city === "chicago") {
    const pd = extractFromProperties(properties, "pd_num");
    const hasPd = pd.some((x) => {
      const n = Number(x);
      return Number.isFinite(n) && n > 0;
    });
    if (hasPd) flags.add("planned_development");
  }

  if (city === "austin") {
    const overlay = extractFromProperties(properties, "overlay");
    for (const v of overlay) flags.add(`overlay:${v}`);
  }

  return [...flags];
}

