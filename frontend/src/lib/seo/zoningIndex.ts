import type { City } from "@/lib/cities";
import { ZoningIndexByCity, type ZoningIndexRow } from "@/lib/seo/zoningIndex.data";

export type { ZoningIndexRow };
export { ZoningIndexByCity };

export function getTopZonesForCity(city: City, limit = 40): ZoningIndexRow[] {
  return (ZoningIndexByCity[city] ?? []).slice(0, limit);
}

export function getZoneName(city: City, zoneCode: string): string | null {
  const normalized = zoneCode.toUpperCase();
  const row = (ZoningIndexByCity[city] ?? []).find((z) => z.zone_code.toUpperCase() === normalized);
  return row?.zone_name ?? null;
}

