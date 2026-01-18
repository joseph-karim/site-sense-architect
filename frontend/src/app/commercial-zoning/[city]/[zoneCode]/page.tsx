import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, AlertCircle } from "lucide-react";
import { Cities, isCity, type City } from "@/lib/cities";
import { getZoneName, getTopZonesForCity } from "@/lib/seo/zoningIndex";
import { UseTypes } from "@/lib/seo/staticParams";
import { getZoningByCode, type ZoningSnapshotData } from "@/lib/data/entitlementDataService";
import { getZoneDisplayName } from "@/lib/data/zoneNameMappings";

// SSG Configuration for SEO
// - Pages are pre-rendered at build time using generateStaticParams
// - ISR revalidates every 24 hours to pick up database updates
// - Zone names come from static zoningIndex.data.ts (no DB needed at build)
export const runtime = "nodejs";
export const revalidate = 86400; // ISR: revalidate every 24 hours

export function generateStaticParams() {
  // SSG all zones from the static index - this runs at build time
  // The zoningIndex.data.ts file is pre-generated and doesn't require DB
  return Cities.flatMap((city) =>
    getTopZonesForCity(city, 200).map((z) => ({
      city,
      zoneCode: encodeURIComponent(z.zone_code)
    }))
  );
}

export async function generateMetadata({ params }: { params: Promise<{ city: string; zoneCode: string }> }): Promise<Metadata> {
  const { city, zoneCode: rawZoneCode } = await params;
  const zoneCode = decodeURIComponent(rawZoneCode).toUpperCase();
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  // Use static zone name from index, fallback to zone mapping
  const zoneName = getZoneName(city as City, zoneCode) || getZoneDisplayName(city as City, zoneCode);

  return {
    title: `${zoneCode} Zoning District — ${zoneName} | Commercial Projects in ${cityName} | Part3`,
    description: `Allowed commercial uses, dimensional limits, and entitlement triggers for ${zoneCode} (${zoneName}) in ${cityName}. Height limits, FAR, setbacks, parking requirements, and overlay flags.`,
    openGraph: {
      title: `${zoneCode} Zoning — ${cityName}`,
      description: `Commercial zoning rules for ${zoneCode} in ${cityName}`,
    }
  };
}

export default async function CommercialZonePage({ params }: { params: Promise<{ city: string; zoneCode: string }> }) {
  const { city: cityParam, zoneCode: zoneCodeParam } = await params;
  const city = cityParam.toLowerCase();
  if (!isCity(city)) return notFound();

  const zoneCode = decodeURIComponent(zoneCodeParam).toUpperCase();

  // Get zone name from static index (available at build time)
  const staticZoneName = getZoneName(city, zoneCode);

  // Fetch detailed zoning data from SSL data service
  // This will use database if available, otherwise returns partial/unavailable state
  let zoningData: ZoningSnapshotData | null = null;
  try {
    zoningData = await getZoningByCode({ city, zone_code: zoneCode });
  } catch (e: unknown) {
    console.error('Error fetching zoning data:', e);
  }

  // Use static name as primary, SSL data as fallback
  const zoneName = staticZoneName || zoningData?.zoning_district?.zone_name || getZoneDisplayName(city, zoneCode);
  const rules = zoningData?.availability === "available" || zoningData?.availability === "partial" ? zoningData : null;

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

      {/* Data availability notice */}
      {zoningData?.availability === "unavailable" && (
        <div className="card-glass p-4 border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <p className="font-medium text-yellow-300">Detailed zoning rules not yet available</p>
              <p className="mt-1">Contact the local planning department to verify uses and dimensional limits for {zoneCode}.</p>
            </div>
          </div>
        </div>
      )}

      <section className="card-glass p-6 space-y-4">
        <h2 className="text-xl font-display font-semibold text-white">Allowed commercial uses</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {UseTypes.map((use) => {
            let status = "Unknown";
            let badgeClass = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300";

            if (rules) {
              if (rules.allowed_uses.permitted?.includes(use)) {
                status = "Permitted";
                badgeClass = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300";
              } else if (rules.allowed_uses.conditional?.includes(use)) {
                status = "Conditional";
                badgeClass = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300";
              } else if (rules.allowed_uses.prohibited?.includes(use)) {
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
        {zoningData?.availability === "partial" && (
          <div className="text-sm text-gray-400">
            Zone identified but detailed use rules not yet curated. Verify with local planning department.
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
                {rules?.height_limit.max_height_ft ? `${rules.height_limit.max_height_ft} ft` : rules?.height_limit.max_height_stories ? `${rules.height_limit.max_height_stories} stories` : "—"}
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
                {rules?.setbacks_ft.front || rules?.setbacks_ft.side || rules?.setbacks_ft.rear
                  ? `Front: ${rules.setbacks_ft.front ?? "—"} ft, Side: ${rules.setbacks_ft.side ?? "—"} ft, Rear: ${rules.setbacks_ft.rear ?? "—"} ft`
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
                {rules?.overlay_flags && rules.overlay_flags.length > 0 ? rules.overlay_flags.join(", ") : "—"}
              </span>
            </div>
            <div className="data-row">
              <span className="text-gray-400">Red flags</span>
              <span className="text-white">
                {rules?.red_flags && rules.red_flags.length > 0 ? rules.red_flags.join(", ") : "—"}
              </span>
            </div>
          </div>
          {rules?.parking?.summary && (
            <div className="data-row mt-3">
              <span className="text-gray-400">Parking</span>
              <span className="text-white text-sm">{rules.parking.summary}</span>
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
        {rules?.data_freshness?.sources && rules.data_freshness.sources.length > 0 && (
          <div className="text-xs text-gray-500 mt-4">
            Sources: {rules.data_freshness.sources.map((src, i) => (
              <span key={i}>
                {i > 0 && ", "}
                <a href={src} target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">
                  {new URL(src).hostname}
                </a>
              </span>
            ))}
            {rules.data_freshness.last_updated && (
              <span className="ml-2">• Last updated: {rules.data_freshness.last_updated}</span>
            )}
          </div>
        )}
        {(!rules?.data_freshness?.sources || rules.data_freshness.sources.length === 0) && (
          <div className="text-xs text-gray-500">
            Data sourced from municipal zoning ordinances. Verify with local planning department for most current requirements.
          </div>
        )}
      </section>

      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": `${zoneCode} Zoning District - ${zoneName}`,
            "description": `Commercial zoning rules for ${zoneCode} in ${city.charAt(0).toUpperCase() + city.slice(1)}`,
            "author": {
              "@type": "Organization",
              "name": "Part3"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Part3"
            },
            "mainEntityOfPage": {
              "@type": "WebPage"
            },
            "about": {
              "@type": "Place",
              "name": `${zoneCode} Zoning District, ${city.charAt(0).toUpperCase() + city.slice(1)}`
            }
          })
        }}
      />
    </div>
  );
}
