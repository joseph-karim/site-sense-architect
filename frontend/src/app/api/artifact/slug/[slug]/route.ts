import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { getArtifactStore } from "@/lib/storage/getArtifactStore";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: { slug: string } }) {
  const artifact = await getArtifactStore().getBySlug(context.params.slug);
  if (!artifact) return jsonError("Artifact not found", 404);
  return jsonOk({ artifact });
}
