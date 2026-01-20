import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { isCity } from "@/lib/cities";
import { createZoningSnapshotArtifact } from "@/lib/services/artifactService";
import { UseTypes } from "@/lib/seo/staticParams";
import { getPool } from "@/lib/db/pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET - Original artifact-based lookup
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to generate zoning snapshot";
    if (String(message).includes("No zoning district found")) return jsonError(message, 404);
    return jsonError(message, 500);
  }
}

// POST - Simple direct lookup by coordinates
const PostSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  use_type: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PostSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Provide latitude and longitude." },
        { status: 400 }
      );
    }

    const { latitude, longitude } = parsed.data;
    const pool = getPool();

    if (!pool) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    // Find the zoning district for this location
    const districtResult = await pool.query(`
      SELECT 
        zd.zone_code,
        zd.zone_name,
        zd.city,
        zd.properties
      FROM zoning_districts zd
      WHERE ST_Contains(zd.geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1
    `, [longitude, latitude]);

    if (districtResult.rows.length === 0) {
      return NextResponse.json(
        { error: "No zoning district found for this location. The address may be outside our coverage area (Seattle, Chicago, Austin)." },
        { status: 404 }
      );
    }

    const district = districtResult.rows[0];

    // Get the zoning rules for this zone
    const rulesResult = await pool.query(`
      SELECT 
        zone_code,
        max_height_ft,
        max_height_stories,
        far,
        lot_coverage_pct,
        setback_front_ft,
        setback_side_ft,
        setback_rear_ft,
        permitted_uses,
        conditional_uses,
        prohibited_uses,
        overlays,
        red_flags,
        parking_rules,
        source_url
      FROM zoning_rules
      WHERE city = $1 AND UPPER(zone_code) = UPPER($2)
      LIMIT 1
    `, [district.city, district.zone_code]);

    const rules = rulesResult.rows[0] || null;

    // Return combined result
    return NextResponse.json({
      zone_code: district.zone_code,
      zone_name: district.zone_name || rules?.zone_name || district.zone_code,
      city: district.city,
      max_height_ft: rules?.max_height_ft ?? null,
      max_height_stories: rules?.max_height_stories ?? null,
      far: rules?.far ?? null,
      lot_coverage_pct: rules?.lot_coverage_pct ?? null,
      setback_front_ft: rules?.setback_front_ft ?? null,
      setback_side_ft: rules?.setback_side_ft ?? null,
      setback_rear_ft: rules?.setback_rear_ft ?? null,
      permitted_uses: rules?.permitted_uses || [],
      conditional_uses: rules?.conditional_uses || [],
      prohibited_uses: rules?.prohibited_uses || [],
      overlays: rules?.overlays || [],
      red_flags: rules?.red_flags || [],
      parking_rules: rules?.parking_rules || {},
      source_url: rules?.source_url || "",
    });

  } catch (error) {
    console.error("Zoning lookup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to lookup zoning" },
      { status: 500 }
    );
  }
}
