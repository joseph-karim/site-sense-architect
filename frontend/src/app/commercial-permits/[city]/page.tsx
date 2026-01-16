import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Cities, isCity } from "@/lib/cities";
import { ProjectTypes } from "@/lib/seo/staticParams";
import { CommercialPermitPathwayClient } from "@/components/CommercialPermitPathwayClient";

export const runtime = "nodejs";
export const revalidate = 3600;

export function generateStaticParams() {
  return Cities.map((city) => ({ city }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const cityName = params.city.charAt(0).toUpperCase() + params.city.slice(1);
  return {
    title: `Commercial building permit process in ${cityName} | Part3`,
    description: `Approvals, review steps, and common delays for commercial construction projects in ${cityName}.`
  };
}

export default function CommercialPermitsCityPage({ params }: { params: { city: string } }) {
  const city = params.city.toLowerCase();
  if (!isCity(city)) return notFound();
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 text-accent-400">
          <FileText className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Commercial Permits</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
          Commercial Building Permit Process in {cityName}
        </h1>
        <p className="text-lg text-gray-400 max-w-3xl">
          Required approvals, review steps, and common delays for{" "}
          <span className="text-white font-medium">commercial and institutional projects only</span>.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {Cities.map((c) => {
            const active = c === city;
            const label = c.charAt(0).toUpperCase() + c.slice(1);
            return (
              <Link
                key={c}
                href={`/commercial-permits/${c}`}
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
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card-glass p-6 space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Clock className="h-5 w-5 text-info-500" />
            <h2 className="font-display font-semibold">Typical gating sequence</h2>
          </div>
          <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
            <li>Zoning compliance and entitlement approvals</li>
            <li>Design review (where applicable)</li>
            <li>Fire/life safety review and plan check</li>
            <li>Corrections cycle → issuance</li>
          </ul>
        </div>
        <div className="card-glass p-6 space-y-3">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-warning-500" />
            <h2 className="font-display font-semibold">What delays commercial permits</h2>
          </div>
          <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
            <li>Incomplete entitlement documentation and missing narratives</li>
            <li>Conditional-use scope (education, healthcare, civic)</li>
            <li>Late code interpretation changes</li>
            <li>Consultant coordination gaps (MEP/fire)</li>
          </ul>
        </div>
      </section>

      <section className="card-glass p-6 space-y-4">
        <h2 className="text-xl font-display font-semibold text-white">Generate a permit pathway summary</h2>
        <CommercialPermitPathwayClient city={city} projectTypes={ProjectTypes} />
        <div className="text-xs text-gray-500">
          Timeline ranges are informational only and vary by scope and completeness.
        </div>
      </section>

      <section className="card-glass p-6 space-y-3">
        <h2 className="text-xl font-display font-semibold text-white">CTA</h2>
        <Link href={`/tools/commercial-permit-pathway?city=${city}`} className="btn-primary">
          Generate a Commercial Permit Pathway Summary
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

