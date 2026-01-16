import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { Cities } from "@/lib/cities";
import {
  CommercialToolSlugs,
  SampleZonesByCity,
  ToolSlugs,
  UseTypes
} from "@/lib/seo/staticParams";
import { ZoningIndexByCity } from "@/lib/seo/zoningIndex";

export const runtime = "nodejs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${env.PORT ?? "3000"}`;
  const now = new Date();

  const urls: string[] = ["/"];

  const zonesByCity: Record<string, string[]> = { ...SampleZonesByCity };
  for (const city of Cities) {
    const fromIndex = (ZoningIndexByCity[city] ?? []).map((z) => z.zone_code);
    if (fromIndex.length > 0) zonesByCity[city] = fromIndex;
  }

  for (const city of Cities) {
    urls.push(`/commercial-zoning/${city}`);
    urls.push(`/commercial-permits/${city}`);
    for (const zoneCode of zonesByCity[city] ?? []) {
      urls.push(`/commercial-zoning/${city}/${encodeURIComponent(zoneCode)}`);
    }
    for (const useType of UseTypes) urls.push(`/commercial-snapshots/${city}/${useType}`);
  }
  for (const tool of ToolSlugs) urls.push(`/tools/${tool}`);
  for (const tool of CommercialToolSlugs) urls.push(`/tools/${tool}`);

  return urls.map((path) => ({
    url: `${base}${path}`,
    lastModified: now
  }));
}
