"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { City } from "@/lib/cities";
import { Cities } from "@/lib/cities";
import { ArrowRight, Download } from "lucide-react";

export function CommercialRiskRegisterToolClient() {
  const search = useSearchParams();
  const initialCity = (search.get("city")?.toLowerCase() as City) ?? "seattle";
  const initialIds = search.get("source_artifact_ids") ?? "";

  const [city, setCity] = useState<City>(Cities.includes(initialCity) ? initialCity : "seattle");
  const [sourceIds, setSourceIds] = useState<string>(initialIds);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ids = sourceIds
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const response = await fetch("/api/risk-register/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ city, source_artifact_ids: ids })
      });
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
      <div className="card-glass p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <div className="text-xs text-gray-400">City</div>
            <select value={city} onChange={(e) => setCity(e.target.value as City)} className="select-elevated mt-1">
              {Cities.map((c) => (
                <option key={c} value={c} className="bg-primary-950">
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <div className="text-xs text-gray-400">Source artifact IDs</div>
            <input
              value={sourceIds}
              onChange={(e) => setSourceIds(e.target.value)}
              placeholder="Paste artifact UUIDs (space or comma separated)"
              className="input-elevated mt-1"
            />
            <div className="mt-1 text-xs text-gray-500">
              Generate zoning snapshot and permit pathway first, then paste their artifact IDs here.
            </div>
          </label>
        </div>
        <button className="btn-primary" onClick={onGenerate} disabled={loading}>
          {loading ? "Generating…" : "Generate commercial risk register"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {error ? <div className="card-glass p-4 text-sm text-error-500">{error}</div> : null}

      {result?.output ? (
        <div className="card-glass p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-white font-display font-semibold">Entitlement Risk Register (Commercial)</div>
              <div className="text-xs text-gray-400">{(result.output.items ?? []).length} items</div>
            </div>
            <div className="flex gap-2">
              <Link href={`/report/${result.web_slug}`} className="btn-secondary py-2 px-4 text-sm">
                View artifact
              </Link>
              <a href={`/api/artifact/${result.artifact_id}/pdf`} className="btn-primary py-2 px-4 text-sm">
                <Download className="h-4 w-4" />
                PDF
              </a>
            </div>
          </div>

          <div className="space-y-2">
            {(result.output.items ?? []).slice(0, 10).map((item: any) => (
              <div key={item.risk_id} className="metric-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-white font-medium">{item.risk_id}</div>
                  <div className="text-xs text-gray-400">{item.source}</div>
                </div>
                <div className="mt-1 text-sm text-gray-300">{item.description}</div>
                <div className="mt-1 text-xs text-gray-500">{item.consequence}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
