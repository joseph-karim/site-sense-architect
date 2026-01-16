import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { CommercialRiskRegisterToolClient } from "@/components/CommercialRiskRegisterToolClient";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Commercial Entitlement Risk Register | Part3",
  description:
    "Convert zoning + permit findings into a structured commercial entitlement risk register you can carry into CA and Part3."
};

export default function CommercialRiskRegisterToolPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 text-warning-500">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Tool</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
          Commercial Entitlement Risk Register
        </h1>
        <p className="text-lg text-gray-400 max-w-3xl">
          Turn zoning and permit assumptions into a structured pre-CA backlog of{" "}
          <span className="text-white font-medium">commercial entitlement risks</span>.
        </p>
      </header>

      <section className="card-glass p-6 space-y-3">
        <h2 className="text-xl font-display font-semibold text-white">How it works</h2>
        <ol className="text-sm text-gray-300 space-y-2 list-decimal pl-5">
          <li>Generate a zoning snapshot artifact.</li>
          <li>Generate a permit pathway artifact.</li>
          <li>Paste the artifact IDs here to generate a risk register.</li>
        </ol>
      </section>

      <Suspense fallback={<div className="card-glass p-6 text-sm text-gray-300">Loading…</div>}>
        <CommercialRiskRegisterToolClient />
      </Suspense>
    </div>
  );
}
