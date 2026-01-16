import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import { CommercialPermitPathwayClient } from "@/components/CommercialPermitPathwayClient";
import { ProjectTypes } from "@/lib/seo/staticParams";
import { Cities } from "@/lib/cities";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Commercial Permit Pathway Summary | Part3",
  description:
    "Generate required permits, review sequence, and timeline ranges for commercial and institutional projects."
};

export default function CommercialPermitPathwayToolPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 text-accent-400">
          <FileText className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Tool</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
          Commercial Permit Pathway Summary
        </h1>
        <p className="text-lg text-gray-400 max-w-3xl">
          Required permits, review sequence, gating items, and timeline ranges for{" "}
          <span className="text-white font-medium">commercial and institutional projects only</span>.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {Cities.map((city) => (
          <div key={city} className="card-glass p-6 space-y-3">
            <div className="text-sm text-gray-400">City</div>
            <div className="text-white font-display font-semibold capitalize">{city}</div>
            <CommercialPermitPathwayClient city={city} projectTypes={ProjectTypes} />
          </div>
        ))}
      </section>

      <section className="card-glass p-6 space-y-3">
        <h2 className="text-xl font-display font-semibold text-white">Next</h2>
        <Link href="/tools/commercial-risk-register" className="btn-primary">
          Generate a commercial risk register
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

