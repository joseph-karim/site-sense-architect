import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { isCity } from "@/lib/cities";
import { createZoningSnapshotArtifact } from "@/lib/services/artifactService";
import { UseTypes } from "@/lib/seo/staticParams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NOTE: z.coerce.number() converts "" to 0, so we use preprocess instead
const QuerySchema = z.object({
  address: z.string().min(3),
  city: z.string().min(2),
  use_type: z.enum(UseTypes),
  lat: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().optional()
  ),
  lng: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().optional()
  )
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    address: url.searchParams.get("address"),
    city: url.searchParams.get("city"),
    use_type: url.searchParams.get("use_type"),
    lat: url.searchParams.get("lat"),
    lng: url.searchParams.get("lng")
  });
  if (!parsed.success) return jsonError("Invalid query params", 400, parsed.error.flatten());

  const city = parsed.data.city.toLowerCase();
  if (!isCity(city)) return jsonError("Unsupported city", 400, { allowed: ["seattle", "austin", "chicago"] });

  try {
    const { artifact, output } = await createZoningSnapshotArtifact({
      city,
      address: parsed.data.address,
      use_type: parsed.data.use_type,
      lat: parsed.data.lat,
      lng: parsed.data.lng
    });

    return jsonOk({ artifact_id: artifact.id, web_slug: artifact.web_slug, output });
  } catch (e: any) {
    const message = e?.message ?? "Failed to generate zoning snapshot";
    if (String(message).includes("No zoning district found")) return jsonError(message, 404);
    return jsonError(message, 500);
  }
}
