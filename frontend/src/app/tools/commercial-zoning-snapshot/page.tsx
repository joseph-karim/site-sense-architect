import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Building2, FileText } from "lucide-react";
import { CommercialZoningSnapshotToolClient } from "@/components/CommercialZoningSnapshotToolClient";
import { UseTypes } from "@/lib/seo/staticParams";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Commercial Zoning Constraint Snapshot | Part3",
  description:
    "Enter an address to generate zoning constraints, overlays, and entitlement risks for commercial and institutional projects."
};

export default function CommercialZoningSnapshotToolPage() {
  const mapboxToken = process.env.MAPBOX_TOKEN;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 text-accent-400">
          <Building2 className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Tool</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
          Commercial Zoning Constraint Snapshot
        </h1>
        <p className="text-lg text-gray-400 max-w-3xl">
          Enter an address. Get zoning constraints, overlays, and entitlement risks for{" "}
          <span className="text-white font-medium">commercial and institutional projects only</span> in minutes.
        </p>
        <div className="flex flex-wrap gap-2">
          {UseTypes.map((u) => (
            <span key={u} className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-white/5 text-gray-300 border border-white/10">
              {u.replace("-", " ")}
            </span>
          ))}
        </div>
      </header>

      <section className="card-glass p-6 space-y-3">
        <h2 className="text-xl font-display font-semibold text-white">What this tool does</h2>
        <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
          <li>Identifies the zoning district for your address via GIS intersection.</li>
          <li>Flags overlay signals (when available from the zoning layer).</li>
          <li>Creates a shareable artifact + PDF export you can carry into CA.</li>
        </ul>
        <div className="text-xs text-gray-500">
          This resource covers commercial/institutional projects only. Residential-only guidance is excluded.
        </div>
      </section>

      <Suspense fallback={<div className="card-glass p-6 text-sm text-gray-300">Loading…</div>}>
        <CommercialZoningSnapshotToolClient mapboxToken={mapboxToken} />
      </Suspense>

      <section className="card-glass p-6 space-y-3">
        <h2 className="text-xl font-display font-semibold text-white">Next</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/tools/commercial-permit-pathway" className="btn-secondary">
            <FileText className="h-4 w-4" />
            Generate permit pathway
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
