import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Cities, isCity } from "@/lib/cities";
import { UseTypes } from "@/lib/seo/staticParams";

export const runtime = "nodejs";
export const revalidate = 86400;

export function generateStaticParams() {
  return Cities.flatMap((city) => UseTypes.map((useType) => ({ city, useType })));
}

export function generateMetadata({ params }: { params: { city: string; useType: string } }): Metadata {
  const cityName = params.city.charAt(0).toUpperCase() + params.city.slice(1);
  const useLabel = params.useType.replaceAll("-", " ");
  return {
    title: `Zoning and entitlement considerations for ${useLabel} projects in ${cityName} | Part3`,
    description: `Common zoning constraints, approval triggers, and risks for commercial ${useLabel} projects in ${cityName}.`
  };
}

export default function CommercialSnapshotPreviewPage({ params }: { params: { city: string; useType: string } }) {
  const city = params.city.toLowerCase();
  if (!isCity(city)) return notFound();
  if (!UseTypes.includes(params.useType as any)) return notFound();

  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  const useLabel = params.useType.replaceAll("-", " ");

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 text-warning-500">
          <ShieldAlert className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Commercial Snapshot Preview</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
          Zoning and Entitlement Considerations for {useLabel} Projects in {cityName}
        </h1>
        <p className="text-lg text-gray-400 max-w-3xl">
          A generalized preview page (not address-specific) to help teams anticipate commercial entitlement risk
          before construction administration.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card-glass p-6 space-y-3">
          <h2 className="text-xl font-display font-semibold text-white">Common commercial constraints</h2>
          <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
            <li>Height and FAR pressure drives early massing tradeoffs.</li>
            <li>Parking and loading requirements are frequently underestimated.</li>
            <li>Design review thresholds and overlays add gating steps.</li>
            <li>Fire/life safety implications change layouts as occupancy clarifies.</li>
          </ul>
        </div>
        <div className="card-glass p-6 space-y-3">
          <h2 className="text-xl font-display font-semibold text-white">How this becomes CA pain later</h2>
          <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
            <li>Untracked entitlement assumptions become RFIs during plan review.</li>
            <li>Late zoning interpretation changes create redesign churn.</li>
            <li>Schedule slips compound when gating items are discovered late.</li>
          </ul>
        </div>
      </section>

      <section className="card-glass p-6 space-y-4">
        <h2 className="text-xl font-display font-semibold text-white">Run this check for your project</h2>
        <div className="flex flex-wrap gap-3">
          <Link href={`/tools/commercial-zoning-snapshot?city=${city}`} className="btn-primary">
            Run a commercial zoning snapshot
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={`/commercial-zoning/${city}`} className="btn-secondary">
            Browse zoning districts
          </Link>
        </div>
        <div className="text-xs text-gray-500">
          Scope: commercial + institutional projects only. Residential-only guidance is excluded.
        </div>
      </section>
    </div>
  );
}

