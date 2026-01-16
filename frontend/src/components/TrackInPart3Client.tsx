"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function TrackInPart3Client({
  artifactId,
  riskItemIds
}: {
  artifactId: string;
  riskItemIds: string[];
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ part3_project_id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.includes("@") && !loading, [email, loading]);

  async function onTrack() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/risk-register/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ artifact_id: artifactId, risk_item_ids: riskItemIds, email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Request failed");
      setResult({ part3_project_id: String(data.part3_project_id) });
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="md:col-span-2">
          <div className="text-xs text-gray-400">Email (required)</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="input-elevated mt-1"
            inputMode="email"
            autoComplete="email"
          />
          <div className="mt-1 text-xs text-gray-500">
            Commercial-only scope. We use this to associate artifacts and Part3 handoff.
          </div>
        </label>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={onTrack} disabled={!canSubmit}>
            {loading ? "Creating…" : "Create Part3 project (Commercial)"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? <div className="card-glass p-4 text-sm text-error-500">{error}</div> : null}

      {result ? (
        <div className="card-glass p-4 text-sm text-gray-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success-500" />
          <div>
            Part3 project created: <span className="font-mono text-white">{result.part3_project_id}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

