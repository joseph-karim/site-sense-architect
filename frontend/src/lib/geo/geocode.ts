import { env } from "@/lib/env";

export type GeocodeResult = {
  normalized_address: string;
  lat: number;
  lng: number;
  city: string | null;
};

export async function geocodeAddress(input: string): Promise<GeocodeResult> {
  if (!env.MAPBOX_TOKEN) {
    // Fallback to Seattle center when no token configured
    return {
      normalized_address: input.trim(),
      lat: 47.6062,
      lng: -122.3321,
      city: null
    };
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json`
  );
  url.searchParams.set("access_token", env.MAPBOX_TOKEN);
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed: ${response.status}`);
  }
  const data = (await response.json()) as any;
  const feature = data?.features?.[0];
  if (!feature) {
    throw new Error("Address not found");
  }

  const [lng, lat] = feature.center as [number, number];
  const normalized_address = feature.place_name as string;
  return { normalized_address, lat, lng, city: null };
}

