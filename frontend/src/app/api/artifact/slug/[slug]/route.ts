import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { getArtifactStore } from "@/lib/storage/getArtifactStore";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const params = await context.params;
  const artifact = await getArtifactStore().getBySlug(params.slug);
  if (!artifact) return jsonError("Artifact not found", 404);
  return jsonOk({ artifact });
}
