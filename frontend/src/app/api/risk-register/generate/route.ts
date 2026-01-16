import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { isCity } from "@/lib/cities";
import { createRiskRegisterArtifact } from "@/lib/services/artifactService";

export const runtime = "nodejs";

const BodySchema = z.object({
  city: z.string().min(2),
  source_artifact_ids: z.array(z.string().uuid()).min(1)
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request body", 400, parsed.error.flatten());

  const city = parsed.data.city.toLowerCase();
  if (!isCity(city)) return jsonError("Unsupported city", 400);

  const { artifact, output } = await createRiskRegisterArtifact({
    city,
    source_artifact_ids: parsed.data.source_artifact_ids
  });

  return jsonOk({ artifact_id: artifact.id, web_slug: artifact.web_slug, output });
}

