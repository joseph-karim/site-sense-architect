import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { isCity } from "@/lib/cities";
import { getTripwires } from "@/lib/services/tripwiresDb";
import { evaluateTripwires } from "@/lib/services/tripwireEval";
import { getArtifactStore } from "@/lib/storage/getArtifactStore";
import { makeSlug } from "@/lib/slug";
import { TripwireDefinitions } from "@/lib/services/tripwireDefinitions";

export const runtime = "nodejs";

const BodySchema = z.object({
  city: z.string().min(2),
  occupancy_type: z.string().min(2),
  inputs: z
    .object({
      corridor_width_in: z.number().positive().optional()
    })
    .default({})
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request body", 400, parsed.error.flatten());

  const city = parsed.data.city.toLowerCase();
  if (!isCity(city)) return jsonError("Unsupported city", 400);

  const rows = await getTripwires({ city, occupancy_type: parsed.data.occupancy_type });
  if (!rows || rows.length === 0) return jsonError("Tripwires not available (seed code_tripwires first).", 400);

  const byName = new Map(rows.map((r) => [r.check_name, r]));
  const evaluator = evaluateTripwires(rows, parsed.data.inputs);
  const checklist = TripwireDefinitions.map((t) => {
    const row = byName.get(t.check_name);
    return {
      check_name: t.check_name,
      label: t.label,
      why_it_matters: t.why,
      code_reference: row?.code_reference ?? t.ref,
      requirement: row?.requirement ?? "",
      common_issue: row?.common_issue ?? "",
      status: evaluator.getStatus(t.check_name)
    };
  });

  const output = {
    checklist,
    inputs: parsed.data.inputs,
    disclaimer:
      "This checklist highlights common issues only. It is not a substitute for professional plan review. Consult a licensed architect."
  };

  const web_slug = makeSlug(["tripwires", city, parsed.data.occupancy_type]);
  const artifact = await getArtifactStore().create({
    type: "tripwire_checklist",
    city,
    web_slug,
    input_params: { city, occupancy_type: parsed.data.occupancy_type, inputs: parsed.data.inputs },
    output_data: output
  });

  return jsonOk({ artifact_id: artifact.id, web_slug: artifact.web_slug, output });
}
