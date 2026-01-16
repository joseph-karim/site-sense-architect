import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { isCity } from "@/lib/cities";
import { createPermitPathwayArtifact } from "@/lib/services/artifactService";

export const runtime = "nodejs";

const QuerySchema = z.object({
  city: z.string().min(2),
  project_type: z.string().min(2)
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    city: url.searchParams.get("city"),
    project_type: url.searchParams.get("project_type")
  });
  if (!parsed.success) return jsonError("Invalid query params", 400, parsed.error.flatten());

  const city = parsed.data.city.toLowerCase();
  if (!isCity(city)) return jsonError("Unsupported city", 400);

  try {
    const { artifact, output } = await createPermitPathwayArtifact({
      city,
      project_type: parsed.data.project_type
    });
    return jsonOk({ artifact_id: artifact.id, web_slug: artifact.web_slug, output });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to generate permit pathway", 500);
  }
}
