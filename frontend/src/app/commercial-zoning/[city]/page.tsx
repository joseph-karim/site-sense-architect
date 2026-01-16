import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Layers, AlertTriangle, ArrowRight } from "lucide-react";
import { Cities, isCity } from "@/lib/cities";
import { getPool } from "@/lib/db/pool";

export const runtime = "nodejs";
export const revalidate = 3600;

export function generateStaticParams() {
  return Cities.map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  return {
    title: `Commercial zoning rules in ${cityName} | Part3`,
    description: `Plain-English zoning constraints, overlays, and approval triggers for commercial and institutional projects in ${cityName}.`
  };
}

export default async function CommercialZoningCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: cityParam } = await params;
  const city = cityParam.toLowerCase();
  if (!isCity(city)) return notFound();

  const pool = getPool();
  const zones =
    pool
      ? (
          await pool.query(
            `
            SELECT zone_code, zone_name
            FROM zoning_districts
            WHERE city = $1
            GROUP BY zone_code, zone_name
            ORDER BY zone_code ASC
            LIMIT 40
            `,
            [city]
          )
        ).rows
      : [];

  const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 text-accent-400">
          <Building2 className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">
            Commercial Zoning
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
          Commercial Zoning Rules in {cityName}
        </h1>
        <p className="text-lg text-gray-400 max-w-3xl">
          Plain-English zoning constraints, overlays, and approval triggers for{" "}
          <span className="text-white font-medium">commercial and institutional projects only</span>.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          {Cities.map((c) => {
            const active = c === city;
            const label = c.charAt(0).toUpperCase() + c.slice(1);
            return (
              <Link
                key={c}
                href={`/commercial-zoning/${c}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? "bg-accent-500 text-white shadow-glow"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="pt-2">
          <Link href={`/tools/commercial-zoning-snapshot?city=${city}`} className="btn-primary">
            Generate a Commercial Zoning Constraint Snapshot
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card-glass p-6 space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Layers className="h-5 w-5 text-accent-400" />
            <h2 className="font-display font-semibold">What governs commercial development</h2>
          </div>
          <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
            <li>Base zoning sets allowed commercial uses and core dimensional limits.</li>
            <li>Overlays and special districts add review triggers and additional constraints.</li>
            <li>Interpretation gaps become entitlement risk if not tracked before CA.</li>
          </ul>
        </div>

        <div className="card-glass p-6 space-y-3">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-warning-500" />
            <h2 className="font-display font-semibold">Where commercial projects get stuck</h2>
          </div>
          <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
            <li>Conditional approvals for education and healthcare uses.</li>
            <li>Parking and loading underestimated early.</li>
            <li>Design review thresholds missed in pre-design.</li>
            <li>FAR bonuses assumed but not earned.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-display font-semibold text-white">
          Common commercial zoning districts
        </h2>
        <div className="card-glass overflow-hidden">
          <div className="grid grid-cols-12 gap-0 px-6 py-3 text-xs text-gray-400 border-b border-white/10">
            <div className="col-span-4">Zone code</div>
            <div className="col-span-8">Description</div>
          </div>
          {zones.length > 0 ? (
            zones.map((z: any) => (
              <div key={`${z.zone_code}-${z.zone_name}`} className="grid grid-cols-12 px-6 py-4 border-b border-white/10 last:border-0">
                <div className="col-span-4">
                  <Link
                    href={`/commercial-zoning/${city}/${encodeURIComponent(String(z.zone_code))}`}
                    className="text-accent-300 hover:text-accent-200 font-medium"
                  >
                    {String(z.zone_code)}
                  </Link>
                </div>
                <div className="col-span-8 text-sm text-gray-300">{String(z.zone_name)}</div>
              </div>
            ))
          ) : (
            <div className="px-6 py-6 text-sm text-gray-400">
              Load `zoning_districts` for {city} to populate this table.
            </div>
          )}
        </div>
      </section>

      <section className="card-glass p-6 space-y-3">
        <h2 className="text-xl font-display font-semibold text-white">
          Overlays that frequently affect commercial work
        </h2>
        <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-300">
          <div className="metric-card">
            <div className="text-white font-medium">Design review</div>
            <div className="mt-1 text-gray-400">Adds gating steps and timeline risk.</div>
          </div>
          <div className="metric-card">
            <div className="text-white font-medium">Historic districts</div>
            <div className="mt-1 text-gray-400">Triggers preservation constraints and approvals.</div>
          </div>
          <div className="metric-card">
            <div className="text-white font-medium">Shoreline / environmental</div>
            <div className="mt-1 text-gray-400">Adds buffers, studies, and agency review.</div>
          </div>
          <div className="metric-card">
            <div className="text-white font-medium">Special commercial districts</div>
            <div className="mt-1 text-gray-400">Downtown controls, bonuses, and use nuance.</div>
          </div>
        </div>
      </section>
    </div>
  );
}

