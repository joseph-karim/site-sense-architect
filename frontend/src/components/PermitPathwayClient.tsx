"use client";

import { useState } from "react";
import Link from "next/link";
import type { City } from "@/lib/cities";

export function PermitPathwayClient({ city, projectType }: { city: City; projectType: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const url = new URL("/api/permits/pathway", window.location.origin);
      url.searchParams.set("city", city);
      url.searchParams.set("project_type", projectType);
      const response = await fetch(url.toString());
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
    <div className="space-y-4">
      <button
        onClick={onGenerate}
        disabled={loading}
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60"
      >
        {loading ? "Generating…" : "Generate permit pathway summary"}
      </button>

      {error ? <div className="rounded-md border border-red-800 bg-red-950/30 p-4 text-sm">{error}</div> : null}

      {result?.output ? (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Permit Pathway Summary</div>
              <div className="text-xs text-zinc-400">
                P50 {result.output.timeline_ranges?.p50_days} days • P90{" "}
                {result.output.timeline_ranges?.p90_days} days
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
            <ListCard title="Required permits" items={result.output.required_permits ?? []} />
            <ListCard title="Departments" items={result.output.departments ?? []} />
            <ListCard title="Review sequence" items={result.output.review_sequence ?? []} />
            <ListCard title="Common delays" items={result.output.common_delays ?? []} />
          </div>

          <div className="text-xs text-zinc-400">{result.output.timeline_ranges?.note}</div>
        </div>
      ) : null}
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-xs font-medium text-zinc-300">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-100">
        {(items ?? []).map((x: string) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

