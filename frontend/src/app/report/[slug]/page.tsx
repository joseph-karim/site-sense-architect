import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtifactStore } from "@/lib/storage/getArtifactStore";
import { ArrowRight, Download, FileJson, FileText, MapPinned, ShieldAlert } from "lucide-react";
import { TrackInPart3Client } from "@/components/TrackInPart3Client";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReportPage({ params }: { params: { slug: string } }) {
  const artifact = await getArtifactStore().getBySlug(params.slug);
  if (!artifact) return notFound();

  const input = artifact.input_params ?? {};
  const output = artifact.output_data ?? {};

  const cityLabel = titleCase(String(artifact.city));
  const createdAt = new Date(artifact.created_at).toLocaleString();

  const address = typeof (input as any).address === "string" ? String((input as any).address) : null;
  const useType = typeof (input as any).use_type === "string" ? String((input as any).use_type) : null;
  const projectType =
    typeof (input as any).project_type === "string" ? String((input as any).project_type) : null;
  const occupancyType =
    typeof (input as any).occupancy_type === "string" ? String((input as any).occupancy_type) : null;

  const zoneCode =
    typeof (output as any)?.zoning_district?.zone_code === "string"
      ? String((output as any).zoning_district.zone_code)
      : null;

  const riskIds =
    artifact.type === "risk_register"
      ? ((output as any)?.items ?? []).map((x: any) => String(x?.risk_id ?? "")).filter(Boolean)
      : [];

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 text-accent-400">
          <FileText className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Artifact</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
          {humanizeArtifactType(artifact.type)}
        </h1>
        <div className="text-sm text-gray-400">
          {cityLabel} • {createdAt} • <span className="font-mono text-gray-300">{artifact.web_slug}</span>
        </div>
      </header>

      <section className="card-glass p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Meta label="City" value={cityLabel} />
          <Meta label="Type" value={humanizeArtifactType(artifact.type)} />
          <Meta label="Created" value={createdAt} />
          {address ? <Meta label="Address" value={address} icon={<MapPinned className="h-4 w-4" />} /> : null}
          {useType ? <Meta label="Use type" value={useType.replaceAll("-", " ")} /> : null}
          {projectType ? <Meta label="Project type" value={projectType.replaceAll("-", " ")} /> : null}
          {occupancyType ? <Meta label="Occupancy type" value={occupancyType.replaceAll("-", " ")} /> : null}
          {zoneCode ? (
            <Meta
              label="Zone"
              value={zoneCode}
              action={
                <Link
                  className="btn-ghost px-3 py-1 text-xs"
                  href={`/commercial-zoning/${artifact.city}/${encodeURIComponent(zoneCode)}`}
                >
                  View zone page <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={`/api/artifact/${artifact.id}/pdf`} className="btn-primary">
            <Download className="h-4 w-4" />
            Download PDF
          </a>
          <a href={`/api/artifact/${artifact.id}`} className="btn-secondary">
            <FileJson className="h-4 w-4" />
            View JSON
          </a>
          <Link href="/" className="btn-ghost">
            Back home
          </Link>
        </div>
      </section>

      {artifact.type === "zoning_snapshot" ? <ZoningSnapshotDetails output={output} /> : null}
      {artifact.type === "permit_pathway" ? <PermitPathwayDetails output={output} /> : null}
      {artifact.type === "tripwire_checklist" ? <TripwireChecklistDetails output={output} /> : null}
      {artifact.type === "risk_register" ? <RiskRegisterDetails output={output} /> : null}

      <section className="card-glass p-6 space-y-4">
        <div className="flex items-center gap-2 text-warning-500">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-xl font-display font-semibold text-white">Carry forward to Part3</h2>
        </div>
        <div className="text-sm text-gray-300 max-w-3xl">
          Commercial entitlement assumptions that aren’t tracked early often surface as RFIs, delays, and disputes
          later. Carry this forward into construction administration.
        </div>

        {artifact.type === "risk_register" ? (
          <TrackInPart3Client artifactId={artifact.id} riskItemIds={riskIds} />
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/tools/commercial-risk-register?city=${artifact.city}&source_artifact_ids=${artifact.id}`}
              className="btn-primary"
            >
              Generate a commercial risk register
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/tools/commercial-permit-pathway" className="btn-secondary">
              Generate permit pathway
            </Link>
            <Link href="/tools/commercial-zoning-snapshot" className="btn-secondary">
              Generate zoning snapshot
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function titleCase(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanizeArtifactType(type: string) {
  switch (type) {
    case "zoning_snapshot":
      return "Commercial Zoning Constraint Snapshot";
    case "permit_pathway":
      return "Commercial Permit Pathway Summary";
    case "tripwire_checklist":
      return "Code Tripwire Checklist";
    case "risk_register":
      return "Entitlement Risk Register (Commercial)";
    case "kickoff_pack":
      return "Kickoff Pack";
    default:
      return type;
  }
}

function Meta({
  label,
  value,
  icon,
  action
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-400">{label}</div>
        {action}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-white">
        {icon}
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="metric-card">
      <div className="text-xs font-medium text-gray-300">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white">
        {(items ?? []).map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function ZoningSnapshotDetails({ output }: { output: Record<string, unknown> }) {
  const district = (output as any)?.zoning_district ?? {};
  const allowed = (output as any)?.allowed_uses ?? {};
  const selected = (output as any)?.selected_use ?? {};

  const statusLabel =
    typeof selected?.status === "string" ? String(selected.status).replaceAll("-", " ") : "unknown";
  const badge =
    selected?.status === "permitted"
      ? "badge-success"
      : selected?.status === "conditional"
        ? "badge-warning"
        : selected?.status === "prohibited"
          ? "badge-error"
          : "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300";

  return (
    <section className="space-y-6">
      <div className="card-glass p-6 space-y-4">
        <h2 className="text-xl font-display font-semibold text-white">Zoning snapshot</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="metric-card">
            <div className="text-xs text-gray-400">Zoning district</div>
            <div className="mt-2 text-sm text-white font-medium">
              {String(district?.zone_code ?? "—")} — {String(district?.zone_name ?? "—")}
            </div>
            {district?.ordinance_url ? (
              <a
                href={String(district.ordinance_url)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs text-gray-300 underline hover:text-gray-200"
              >
                Ordinance source
              </a>
            ) : null}
          </div>

          <div className="metric-card">
            <div className="text-xs text-gray-400">Selected use</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-sm text-white font-medium capitalize">
                {String(selected?.use_type ?? "—").replaceAll("-", " ")}
              </div>
              <span className={badge}>{statusLabel}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ListCard title="Permitted uses" items={(allowed?.permitted ?? []).map(String)} />
          <ListCard title="Conditional uses" items={(allowed?.conditional ?? []).map(String)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ListCard title="Prohibited uses" items={(allowed?.prohibited ?? []).map(String)} />
          <ListCard title="Overlay flags" items={((output as any)?.overlay_flags ?? []).map(String)} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-glass p-6 space-y-3">
          <h3 className="text-lg font-display font-semibold text-white">Dimensional limits</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="data-row">
              <span className="text-gray-400">Height</span>
              <span className="text-white">
                {((output as any)?.height_limit?.max_height_ft ?? "—") as any} ft
              </span>
            </div>
            <div className="data-row">
              <span className="text-gray-400">FAR / FSR</span>
              <span className="text-white">{String((output as any)?.far ?? "—")}</span>
            </div>
            <div className="data-row">
              <span className="text-gray-400">Lot coverage</span>
              <span className="text-white">{String((output as any)?.lot_coverage_pct ?? "—")}%</span>
            </div>
            <div className="data-row">
              <span className="text-gray-400">Setbacks</span>
              <span className="text-white">
                F:{String((output as any)?.setbacks_ft?.front ?? "—")} S:
                {String((output as any)?.setbacks_ft?.side ?? "—")} R:{String((output as any)?.setbacks_ft?.rear ?? "—")}
              </span>
            </div>
          </div>
        </div>

        <div className="card-glass p-6 space-y-3">
          <h3 className="text-lg font-display font-semibold text-white">Red flags</h3>
          <ListCard title="Common risks" items={((output as any)?.red_flags ?? []).map(String)} />
          <div className="text-xs text-gray-500">{String((output as any)?.disclaimer ?? "")}</div>
        </div>
      </div>
    </section>
  );
}

function PermitPathwayDetails({ output }: { output: Record<string, unknown> }) {
  const timeline = (output as any)?.timeline_ranges ?? {};
  return (
    <section className="card-glass p-6 space-y-4">
      <h2 className="text-xl font-display font-semibold text-white">Permit pathway</h2>
      <div className="text-sm text-gray-300">
        P50 <span className="text-white font-medium">{String(timeline?.p50_days ?? "—")}</span> days • P90{" "}
        <span className="text-white font-medium">{String(timeline?.p90_days ?? "—")}</span> days
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ListCard title="Required permits" items={((output as any)?.required_permits ?? []).map(String)} />
        <ListCard title="Departments" items={((output as any)?.departments ?? []).map(String)} />
        <ListCard title="Review sequence" items={((output as any)?.review_sequence ?? []).map(String)} />
        <ListCard title="Common delays" items={((output as any)?.common_delays ?? []).map(String)} />
      </div>
      <div className="text-xs text-gray-500">{String(timeline?.note ?? "")}</div>
    </section>
  );
}

function TripwireChecklistDetails({ output }: { output: Record<string, unknown> }) {
  const checklist = ((output as any)?.checklist ?? []) as any[];
  return (
    <section className="card-glass p-6 space-y-4">
      <h2 className="text-xl font-display font-semibold text-white">Tripwire checklist</h2>
      <div className="text-xs text-gray-500">{String((output as any)?.disclaimer ?? "")}</div>
      <div className="space-y-2">
        {checklist.slice(0, 10).map((item: any, idx: number) => (
          <div key={String(item?.check_name ?? item?.label ?? idx)} className="metric-card">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-white font-medium">{String(item?.label ?? item?.check_name ?? "Tripwire")}</div>
              <div className="text-xs text-gray-400">{String(item?.code_reference ?? "")}</div>
            </div>
            <div className="mt-1 text-sm text-gray-300">{String(item?.requirement ?? "")}</div>
            <div className="mt-1 text-xs text-gray-500">{String(item?.status ?? "Not Checked")}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskRegisterDetails({ output }: { output: Record<string, unknown> }) {
  const items = ((output as any)?.items ?? []) as any[];
  return (
    <section className="card-glass p-6 space-y-4">
      <h2 className="text-xl font-display font-semibold text-white">Risk register</h2>
      <div className="text-sm text-gray-300">{items.length} items</div>
      <div className="space-y-2">
        {items.slice(0, 25).map((item: any, idx: number) => (
          <div key={String(item?.risk_id ?? idx)} className="metric-card">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-white font-medium">{String(item?.risk_id ?? "—")}</div>
              <div className="text-xs text-gray-400">{String(item?.source ?? "")}</div>
            </div>
            <div className="mt-1 text-sm text-gray-300">{String(item?.description ?? "")}</div>
            <div className="mt-1 text-xs text-gray-500">{String(item?.consequence ?? "")}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
