import { NextRequest } from "next/server";
import { jsonError } from "@/lib/http";
import { getArtifactStore } from "@/lib/storage/getArtifactStore";
import { renderArtifactPdf } from "@/lib/pdf/simplePdf";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const artifact = await getArtifactStore().getById(context.params.id);
  if (!artifact) return jsonError("Artifact not found", 404);

  const lines: string[] = [
    `Type: ${artifact.type}`,
    `City: ${artifact.city}`,
    `Created: ${artifact.created_at}`,
    `Slug: ${artifact.web_slug}`,
    "",
    "This PDF is a lightweight placeholder renderer.",
    "Swap to Puppeteer or React-PDF for production fidelity."
  ];

  const pdf = renderArtifactPdf("Part3 Artifact", lines);
  const pdfBytes = new Uint8Array(pdf);
  return new Response(pdfBytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${artifact.web_slug}.pdf"`
    }
  });
}
