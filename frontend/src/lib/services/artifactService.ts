import type { City } from "@/lib/cities";
import { geocodeAddress } from "@/lib/geo/geocode";
import { mockZoningSnapshot } from "@/lib/mock/zoning";
import { mockPermitPathway } from "@/lib/mock/permits";
import { mockTripwireChecklist } from "@/lib/mock/tripwires";
import { getArtifactStore } from "@/lib/storage/getArtifactStore";
import { makeSlug } from "@/lib/slug";
import type { ArtifactRecord } from "@/lib/artifacts/types";
import { getPool } from "@/lib/db/pool";
import { insertAddressIfConfigured } from "@/lib/services/addressesDb";
import { findZoningDistrictByPoint, getZoningRulesForZone } from "@/lib/services/zoningDb";
import { getTripwires } from "@/lib/services/tripwiresDb";
import { getPermitStats } from "@/lib/services/permitsDb";
import { deriveOverlayFlags } from "@/lib/services/overlayFlags";
import { TripwireDefinitions } from "@/lib/services/tripwireDefinitions";

export async function createZoningSnapshotArtifact(input: {
  city: City;
  address: string;
  use_type: string;
  lat?: number;
  lng?: number;
}): Promise<{ artifact: ArtifactRecord; output: unknown }> {
  const geocode =
    input.lat !== undefined && input.lng !== undefined
      ? {
          normalized_address: input.address.trim(),
          lat: input.lat,
          lng: input.lng,
          city: null
        }
      : await geocodeAddress(input.address);

  const poolConfigured = Boolean(getPool());
  let district = null;
  try {
    district = await findZoningDistrictByPoint({ city: input.city, lat: geocode.lat, lng: geocode.lng });
  } catch (e: unknown) {
    console.error('Error finding zoning district:', e);
    throw e;
  }

  if (poolConfigured && !district) {
    throw new Error("No zoning district found for this location (load zoning_districts first).");
  }

  let rules = null;
  if (district) {
    try {
      rules = await getZoningRulesForZone({ city: input.city, zone_code: district.zone_code });
    } catch (e: unknown) {
      console.error('Error fetching zoning rules:', e);
      throw e;
    }
  }

  const overlaysFromDistrict = district ? deriveOverlayFlags(input.city, district.properties) : [];

  const output =
    district && rules
      ? {
          zoning_district: {
            zone_code: district.zone_code,
            zone_name: district.zone_name,
            ordinance_url: rules.source_url
          },
          allowed_uses: {
            permitted: rules.permitted_uses ?? [],
            conditional: rules.conditional_uses ?? [],
            prohibited: rules.prohibited_uses ?? []
          },
          selected_use: {
            use_type: input.use_type,
            status: rules.permitted_uses?.includes(input.use_type)
              ? "permitted"
              : rules.conditional_uses?.includes(input.use_type)
                ? "conditional"
                : rules.prohibited_uses?.includes(input.use_type)
                  ? "prohibited"
                  : "unknown"
          },
          height_limit: {
            max_height_ft: rules.max_height_ft ?? null,
            max_height_stories: rules.max_height_stories ?? null
          },
          far: rules.far ?? null,
          lot_coverage_pct: rules.lot_coverage_pct ?? null,
          setbacks_ft: {
            front: rules.setback_front_ft ?? null,
            side: rules.setback_side_ft ?? null,
            rear: rules.setback_rear_ft ?? null
          },
          parking: {
            summary:
              rules.parking_rules?.[input.use_type] ??
              rules.parking_rules?.summary ??
              "Varies by use; verify requirements with local code.",
            reductions: rules.parking_rules?.reductions ?? []
          },
          overlay_flags: Array.from(new Set([...(rules.overlays ?? []), ...overlaysFromDistrict])),
          red_flags: rules.red_flags ?? [],
          data_freshness: {
            sources: [district.source_url, rules.source_url].filter(Boolean),
            last_updated: district.last_updated
          },
          disclaimer:
            "This summary is for informational purposes only. Verify all constraints with the local planning department before proceeding."
        }
      : district
        ? {
            zoning_district: {
              zone_code: district.zone_code,
              zone_name: district.zone_name,
              ordinance_url: district.source_url
            },
            allowed_uses: { permitted: [], conditional: [], prohibited: [] },
            height_limit: { max_height_ft: null, max_height_stories: null },
            far: null,
            lot_coverage_pct: null,
            setbacks_ft: { front: null, side: null, rear: null },
            parking: { summary: "Verify requirements with local code.", reductions: [] },
            overlay_flags: overlaysFromDistrict,
            red_flags: [],
            data_freshness: { sources: [district.source_url], last_updated: district.last_updated },
            disclaimer:
              "This summary is for informational purposes only. Verify all constraints with the local planning department before proceeding."
          }
        : mockZoningSnapshot(input.city, input.use_type);

  const zoneCodeForSlug = (output as any)?.zoning_district?.zone_code ?? "unknown";
  const web_slug = makeSlug(["zoning", input.city, zoneCodeForSlug, input.use_type]);

  const address_id = await insertAddressIfConfigured({
    input_address: input.address,
    normalized_address: geocode.normalized_address,
    lat: geocode.lat,
    lng: geocode.lng,
    city: input.city
  });

  const artifact = await getArtifactStore().create({
    type: "zoning_snapshot",
    address_id,
    city: input.city,
    web_slug,
    input_params: { ...input, geocode },
    output_data: output
  });
  return { artifact, output };
}

export async function createPermitPathwayArtifact(input: {
  city: City;
  project_type: string;
}): Promise<{ artifact: ArtifactRecord; output: unknown }> {
  const stats = await getPermitStats({ city: input.city, project_type: input.project_type });
  const output =
    stats && stats.length > 0
      ? {
          required_permits: ["Building", "Mechanical", "Electrical", "Plumbing", "Fire"],
          review_sequence: ["Intake", "Plan Review", "Corrections", "Permit Issuance"],
          departments: ["Planning", "Building", "Fire"],
          timeline_ranges: {
            p50_days: Math.max(...stats.map((s) => s.p50_days)),
            p90_days: Math.max(...stats.map((s) => s.p90_days)),
            note: `Calculated from permit_stats (${stats.reduce((a, s) => a + s.sample_size, 0)} samples).`
          },
          common_delays: Array.from(new Set(stats.flatMap((s) => s.common_delays ?? []))).slice(0, 3),
          gating_items: ["You cannot proceed to permit issuance until corrections are resolved"]
        }
      : mockPermitPathway(input.city, input.project_type);
  const web_slug = makeSlug(["permits", input.city, input.project_type]);
  const artifact = await getArtifactStore().create({
    type: "permit_pathway",
    city: input.city,
    web_slug,
    input_params: input,
    output_data: output
  });
  return { artifact, output };
}

export async function createTripwireChecklistArtifact(input: {
  city: City;
  occupancy_type: string;
}): Promise<{ artifact: ArtifactRecord; output: unknown }> {
  const rows = await getTripwires({ city: input.city, occupancy_type: input.occupancy_type });
  const byName = new Map((rows ?? []).map((r) => [r.check_name, r]));

  const checklist = TripwireDefinitions.map((t) => {
    const row = byName.get(t.check_name);
    return {
      check_name: t.check_name,
      label: t.label,
      why_it_matters: t.why,
      code_reference: row?.code_reference ?? t.ref,
      requirement: row?.requirement ?? "",
      common_issue: row?.common_issue ?? "",
      status: "Not Checked" as const
    };
  });

  const output = {
    checklist:
      rows && rows.length > 0
        ? checklist
        : mockTripwireChecklist(input.city, input.occupancy_type),
    disclaimer:
      "This checklist highlights common issues only. It is not a substitute for professional plan review. Consult a licensed architect."
  };
  const web_slug = makeSlug(["tripwires", input.city, input.occupancy_type]);
  const artifact = await getArtifactStore().create({
    type: "tripwire_checklist",
    city: input.city,
    web_slug,
    input_params: input,
    output_data: output
  });
  return { artifact, output };
}

export async function createRiskRegisterArtifact(input: {
  city: City;
  source_artifact_ids: string[];
}): Promise<{ artifact: ArtifactRecord; output: unknown }> {
  const store = getArtifactStore();
  const sources = await Promise.all(input.source_artifact_ids.map((id) => store.getById(id)));
  const sourceArtifacts = sources.filter(Boolean) as ArtifactRecord[];

  const riskRows: Array<{
    risk_id: string;
    description: string;
    source: string;
    status: "Open" | "In Review" | "Resolved";
    consequence: string;
  }> = [];

  for (const src of sourceArtifacts) {
    if (src.type === "zoning_snapshot") {
      const redFlags = (src.output_data as any)?.red_flags ?? [];
      for (const flag of redFlags) {
        riskRows.push({
          risk_id: "",
          description: String(flag),
          source: "Zoning",
          status: "Open",
          consequence: "Interpretation required; may trigger design review or variance"
        });
      }
    }
    if (src.type === "tripwire_checklist") {
      const checklist = (src.output_data as any)?.checklist ?? [];
      for (const item of checklist) {
        if (item?.status === "Likely Issue") {
          riskRows.push({
            risk_id: "",
            description: String(item?.label ?? item?.check_name ?? "Tripwire"),
            source: "Code check",
            status: "Open",
            consequence: "RFI during permit review"
          });
        }
      }
    }
    if (src.type === "permit_pathway") {
      const delays = (src.output_data as any)?.common_delays ?? [];
      for (const delay of delays.slice(0, 2)) {
        riskRows.push({
          risk_id: "",
          description: `Common delay: ${String(delay)}`,
          source: "Permit pathway",
          status: "Open",
          consequence: "Schedule risk (additional review cycle)"
        });
      }
    }
  }

  const unique = new Map<string, (typeof riskRows)[number]>();
  for (const row of riskRows) unique.set(row.description, row);
  const deduped = [...unique.values()].slice(0, 25);

  const items = deduped.map((row, index) => ({
    ...row,
    risk_id: `E-${String(index + 1).padStart(3, "0")}`
  }));

  const output = {
    items,
    cta: "Track in Part3"
  };

  const web_slug = makeSlug(["risk-register", input.city]);
  const artifact = await store.create({
    type: "risk_register",
    city: input.city,
    web_slug,
    input_params: input,
    output_data: output
  });

  await persistRiskItemsIfConfigured(artifact.id, items);

  return { artifact, output };
}

async function persistRiskItemsIfConfigured(
  artifactId: string,
  items: Array<{ risk_id: string; description: string; source: string; status: string; consequence: string }>
) {
  if (items.length === 0) return;
  const pool = getPool();
  if (!pool) return;

  const values = items
    .map(
      (_item, idx) =>
        `($1, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5}, $${idx * 5 + 6})`
    )
    .join(", ");
  const params: any[] = [artifactId];
  for (const item of items) {
    params.push(item.risk_id, item.description, item.source, item.status, item.consequence);
  }

  await pool.query(
    `
    INSERT INTO risk_items (artifact_id, risk_id, description, source, status, consequence)
    VALUES ${values}
    ON CONFLICT (artifact_id, risk_id) DO NOTHING
    `,
    params
  );
}

export async function createKickoffPackArtifact(input: {
  city: City;
  address: string;
  use_type: string;
  project_type: string;
  occupancy_type: string;
  email: string;
}): Promise<{ artifact: ArtifactRecord; output: unknown; pdf_url: string }> {
  const geocode = await geocodeAddress(input.address);

  const zoning = mockZoningSnapshot(input.city, input.use_type);
  const permits = mockPermitPathway(input.city, input.project_type);
  const tripwires = {
    checklist: mockTripwireChecklist(input.city, input.occupancy_type),
    disclaimer:
      "This checklist highlights common issues only. It is not a substitute for professional plan review. Consult a licensed architect."
  };

  const riskFromZoning = (zoning.red_flags ?? []).map((flag) => ({
    risk_id: "",
    description: String(flag),
    source: "Zoning",
    status: "Open" as const,
    consequence: "Interpretation required; may trigger design review or variance"
  }));
  const riskFromOverlays = (zoning.overlay_flags ?? []).map((overlay) => ({
    risk_id: "",
    description: `Overlay flag: ${String(overlay)}`,
    source: "Zoning",
    status: "Open" as const,
    consequence: "Additional review scope and timeline risk"
  }));

  const riskItems = [...riskFromZoning, ...riskFromOverlays].slice(0, 25).map((row, index) => ({
    ...row,
    risk_id: `E-${String(index + 1).padStart(3, "0")}`
  }));

  const output = {
    contents: {
      zoning_snapshot: zoning,
      permit_pathway: permits,
      tripwire_checklist: tripwires,
      risk_register: { items: riskItems, cta: "Track in Part3" },
      known_ambiguities: [
        "Confirm intended occupancy and occupant load",
        "Confirm parking reductions applicability"
      ]
    }
  };

  const web_slug = makeSlug(["kickoff-pack", input.city]);
  const address_id = await insertAddressIfConfigured({
    input_address: input.address,
    normalized_address: geocode.normalized_address,
    lat: geocode.lat,
    lng: geocode.lng,
    city: input.city
  });
  const artifact = await getArtifactStore().create({
    type: "kickoff_pack",
    address_id,
    city: input.city,
    web_slug,
    user_email: input.email,
    input_params: { ...input, geocode },
    output_data: output
  });

  return { artifact, output, pdf_url: `/api/artifact/${artifact.id}/pdf` };
}
