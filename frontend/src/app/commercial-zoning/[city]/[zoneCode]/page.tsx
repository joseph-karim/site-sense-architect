import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { Cities, isCity } from "@/lib/cities";
import { getZoneName, getTopZonesForCity } from "@/lib/seo/zoningIndex";
import { UseTypes } from "@/lib/seo/staticParams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  // SSG a limited, high-value set of zone pages; expand by populating the zoning index.
  return Cities.flatMap((city) => getTopZonesForCity(city, 40).map((z) => ({ city, zoneCode: z.zone_code })));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string; zoneCode: string }> }): Promise<Metadata> {
  const { city, zoneCode } = await params;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  return {
    title: `${zoneCode} zoning district — commercial projects in ${cityName} | Part3`,
    description: `Allowed commercial uses, dimensional limits, and entitlement triggers for ${zoneCode} in ${cityName}.`
  };
}

export default async function CommercialZonePage({ params }: { params: Promise<{ city: string; zoneCode: string }> }) {
  const { city: cityParam, zoneCode: zoneCodeParam } = await params;
  const city = cityParam.toLowerCase();
  if (!isCity(city)) return notFound();

  const zoneCode = decodeURIComponent(zoneCodeParam).toUpperCase();
  const zoneName = getZoneName(city, zoneCode);
  
  // Fetch zoning rules from database
  const { getZoningRulesForZone } = await import("@/lib/services/zoningDb");
  let rules = null;
  try {
    rules = await getZoningRulesForZone({ city, zone_code: zoneCode });
  } catch (e: unknown) {
    console.error('Error fetching zoning rules:', e);
    // Continue rendering even if fetch fails
  }

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 text-accent-400">
          <Building2 className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Commercial Zoning District</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
          {zoneCode} Zoning District — Commercial Projects in {city.charAt(0).toUpperCase() + city.slice(1)}
        </h1>
        <p className="text-lg text-gray-400 max-w-3xl">
          Allowed commercial uses, dimensional limits, and entitlement triggers. Residential-only guidance is intentionally excluded.
        </p>
        {zoneName ? <div className="text-sm text-gray-400">{zoneName}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Link href={`/commercial-zoning/${city}`} className="btn-ghost">
            ← Back to city zoning
          </Link>
          <Link href={`/tools/commercial-zoning-snapshot?city=${city}`} className="btn-primary">
            Check this zoning against your address
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="card-glass p-6 space-y-4">
        <h2 className="text-xl font-display font-semibold text-white">Allowed commercial uses</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {UseTypes.map((use) => {
            let status = "Unknown";
            let badgeClass = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300";
            
            if (rules) {
              if (rules.permitted_uses?.includes(use)) {
                status = "Permitted";
                badgeClass = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300";
              } else if (rules.conditional_uses?.includes(use)) {
                status = "Conditional";
                badgeClass = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300";
              } else if (rules.prohibited_uses?.includes(use)) {
                status = "Prohibited";
                badgeClass = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300";
              }
            }

            return (
              <div key={use} className="metric-card flex items-center justify-between gap-3">
                <div className="text-sm text-white font-medium capitalize">{use.replace("-", " ")}</div>
                <span className={badgeClass}>{status}</span>
              </div>
            );
          })}
        </div>
        {!rules && (
          <div className="text-sm text-gray-400">
            Populate `zoning_rules` to show permitted/conditional/prohibited uses for this district.
          </div>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card-glass p-6 space-y-3">
          <h2 className="text-xl font-display font-semibold text-white">Key dimensional limits (commercial)</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="data-row">
              <span className="text-gray-400">Height</span>
              <span className="text-white">
                {rules?.max_height_ft ? `${rules.max_height_ft} ft` : rules?.max_height_stories ? `${rules.max_height_stories} stories` : "—"}
              </span>
            </div>
            <div className="data-row">
              <span className="text-gray-400">FAR / FSR</span>
              <span className="text-white">{rules?.far ? String(rules.far) : "—"}</span>
            </div>
            <div className="data-row">
              <span className="text-gray-400">Lot coverage</span>
              <span className="text-white">{rules?.lot_coverage_pct ? `${rules.lot_coverage_pct}%` : "—"}</span>
            </div>
            <div className="data-row">
              <span className="text-gray-400">Setbacks</span>
              <span className="text-white">
                {rules?.setback_front_ft || rules?.setback_side_ft || rules?.setback_rear_ft
                  ? `Front: ${rules.setback_front_ft ?? "—"} ft, Side: ${rules.setback_side_ft ?? "—"} ft, Rear: ${rules.setback_rear_ft ?? "—"} ft`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="card-glass p-6 space-y-3">
          <h2 className="text-xl font-display font-semibold text-white">Commercial overlays & triggers</h2>
          <div className="text-sm text-gray-300 space-y-2">
            <div className="data-row">
              <span className="text-gray-400">Overlay flags</span>
              <span className="text-white">
                {rules?.overlays && rules.overlays.length > 0 ? rules.overlays.join(", ") : "—"}
              </span>
            </div>
            <div className="data-row">
              <span className="text-gray-400">Curated overlays</span>
              <span className="text-white">
                {rules?.overlays && rules.overlays.length > 0 ? rules.overlays.join(", ") : "—"}
              </span>
            </div>
          </div>
          {!rules && (
            <div className="text-sm text-gray-400">
              Curate overlays and dimensional limits in `zoning_rules` for higher fidelity.
            </div>
          )}
        </div>
      </section>

      <section className="card-glass p-6 space-y-3">
        <h2 className="text-xl font-display font-semibold text-white">What this means for commercial architects</h2>
        <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
          <li>Validate allowed use early to avoid late conditional-use surprises.</li>
          <li>Track parking/loading assumptions as risks before CA kickoff.</li>
          <li>Overlays often add gating steps that change schedules more than drawings do.</li>
        </ul>
        <div className="text-xs text-gray-500">
          Sources: curate zone sources in `zoning_rules.source_url` (and optionally include zoning layer source on the city page).
        </div>
      </section>
    </div>
  );
}
