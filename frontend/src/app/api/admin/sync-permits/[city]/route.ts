import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { isCity } from "@/lib/cities";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, context: { params: Promise<{ city: string }> }) {
  const params = await context.params;
  const city = params.city.toLowerCase();
  if (!isCity(city)) return jsonError("Unsupported city", 400);

  // TODO: implement Socrata sync to `permits` table (App Token + paging)
  return jsonOk({ status: "queued", job: "sync-permits", city });
}

