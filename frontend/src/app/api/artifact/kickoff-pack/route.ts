import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { isCity } from "@/lib/cities";
import { createKickoffPackArtifact } from "@/lib/services/artifactService";
import { UseTypes } from "@/lib/seo/staticParams";

export const runtime = "nodejs";

const BodySchema = z.object({
  address: z.string().min(3),
  city: z.string().min(2),
  use_type: z.enum(UseTypes),
  project_type: z.string().min(2),
  occupancy_type: z.string().min(2),
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request body", 400, parsed.error.flatten());

  const city = parsed.data.city.toLowerCase();
  if (!isCity(city)) return jsonError("Unsupported city", 400);

  const { artifact, pdf_url } = await createKickoffPackArtifact({
    city,
    address: parsed.data.address,
    use_type: parsed.data.use_type,
    project_type: parsed.data.project_type,
    occupancy_type: parsed.data.occupancy_type,
    email: parsed.data.email
  });

  return jsonOk({ artifact_id: artifact.id, web_slug: artifact.web_slug, pdf_url });
}
