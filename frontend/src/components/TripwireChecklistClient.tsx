"use client";

import { useState } from "react";
import Link from "next/link";
import { Cities } from "@/lib/cities";

const OccupancyTypes = ["business", "assembly", "educational", "healthcare", "mercantile"] as const;

export function TripwireChecklistClient({ tool }: { tool?: string }) {
  const [city, setCity] = useState<(typeof Cities)[number]>("seattle");
  const [occupancyType, setOccupancyType] =
    useState<(typeof OccupancyTypes)[number]>("business");
  const [corridorWidth, setCorridorWidth] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const isCorridorTool = tool === "corridor-width-checker";
      const widthNum = corridorWidth.trim() ? Number(corridorWidth.trim()) : null;
      const shouldEvaluate = isCorridorTool && widthNum && Number.isFinite(widthNum);

      const response = shouldEvaluate
        ? await fetch("/api/code/tripwires/evaluate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              city,
              occupancy_type: occupancyType,
              inputs: { corridor_width_in: widthNum }
            })
          })
        : await fetch(
            (() => {
              const url = new URL("/api/code/tripwires", window.location.origin);
              url.searchParams.set("city", city);
              url.searchParams.set("occupancy_type", occupancyType);
              return url.toString();
            })()
          );

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 md:grid-cols-3">
        <label>
          <div className="text-xs text-zinc-400">City</div>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value as any)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            {Cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2">
          <div className="text-xs text-zinc-400">Occupancy type</div>
          <select
            value={occupancyType}
            onChange={(e) => setOccupancyType(e.target.value as any)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            {OccupancyTypes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        {tool === "corridor-width-checker" ? (
          <label className="md:col-span-3">
            <div className="text-xs text-zinc-400">Corridor clear width (inches)</div>
            <input
              value={corridorWidth}
              onChange={(e) => setCorridorWidth(e.target.value)}
              inputMode="decimal"
              placeholder='e.g. 44'
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <div className="mt-1 text-xs text-zinc-500">
              If provided, Part3 will evaluate this one check; all others remain “Not Checked”.
            </div>
          </label>
        ) : null}
        <div className="md:col-span-3">
          <button
            onClick={onRun}
            disabled={loading}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60"
          >
            {loading ? "Running…" : "Run checklist"}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-800 bg-red-950/30 p-4 text-sm">{error}</div> : null}

      {result?.output ? (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Code Tripwire Checklist</div>
              <div className="text-xs text-zinc-400">
                {city} • {occupancyType}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/report/${result.web_slug}`}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm"
              >
                View artifact
              </Link>
              <a
                href={`/api/artifact/${result.artifact_id}/pdf`}
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-950"
              >
                Download PDF
              </a>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {(result.output.checklist ?? []).map((item: any) => (
              <div key={item.check_name} className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                    {item.status}
                  </div>
                </div>
                <div className="mt-1 text-xs text-zinc-400">{item.why_it_matters}</div>
                <div className="mt-2 text-xs text-zinc-300">{item.code_reference}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-zinc-400">{result.output.disclaimer}</div>
        </div>
      ) : null}
    </div>
  );
}
