import { notFound } from "next/navigation";
import { ToolSlugs } from "@/lib/seo/staticParams";
import { TripwireChecklistClient } from "@/components/TripwireChecklistClient";
import type { Metadata } from "next";

export function generateStaticParams() {
  return ToolSlugs.map((tool) => ({ tool }));
}

function titleFromSlug(slug: string) {
  return slug
    .replaceAll("-", " ")
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  return {
    title: `${titleFromSlug(tool)} | Part3`,
    description: `Run a code tripwire check and generate a downloadable artifact (web + PDF).`
  };
}

export default async function ToolLandingPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  if (!ToolSlugs.includes(tool as any)) return notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titleFromSlug(tool)}</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Tool landing pages are SEO entry points and should route into the tripwire checklist artifact.
        </p>
      </div>
      <TripwireChecklistClient tool={tool} />
    </div>
  );
}
