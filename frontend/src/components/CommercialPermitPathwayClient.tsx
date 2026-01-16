"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { City } from "@/lib/cities";
import { ArrowRight, Download } from "lucide-react";

export function CommercialPermitPathwayClient({
  city,
  projectTypes
}: {
  city: City;
  projectTypes: readonly string[];
}) {
  const [projectType, setProjectType] = useState(projectTypes[0] ?? "new-construction");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const projectLabel = useMemo(() => String(projectType).replaceAll("-", " "), [projectType]);

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
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="md:col-span-2">
          <div className="text-xs text-gray-400">Project type</div>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="select-elevated mt-1"
          >
            {projectTypes.map((p) => (
              <option key={p} value={p} className="bg-primary-950">
                {String(p).replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={onGenerate} disabled={loading}>
            {loading ? "Generating…" : `Generate`}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? <div className="card-glass p-4 text-sm text-error-500">{error}</div> : null}

      {result?.output ? (
        <div className="card-glass p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-white font-display font-semibold">Commercial Permit Pathway Summary</div>
              <div className="text-xs text-gray-400">
                {projectLabel} • P50 {result.output.timeline_ranges?.p50_days ?? "—"} days • P90{" "}
                {result.output.timeline_ranges?.p90_days ?? "—"} days
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/report/${result.web_slug}`} className="btn-secondary py-2 px-4 text-sm">
                View artifact
              </Link>
              <a
                href={`/api/artifact/${result.artifact_id}/pdf`}
                className="btn-primary py-2 px-4 text-sm"
              >
                <Download className="h-4 w-4" />
                PDF
              </a>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ListCard title="Required permits" items={result.output.required_permits ?? []} />
            <ListCard title="Departments" items={result.output.departments ?? []} />
            <ListCard title="Review sequence" items={result.output.review_sequence ?? []} />
            <ListCard title="Common delays" items={result.output.common_delays ?? []} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="metric-card">
      <div className="text-xs font-medium text-gray-300">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white">
        {(items ?? []).map((x: string) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

