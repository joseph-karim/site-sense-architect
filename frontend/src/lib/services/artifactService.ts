/**
 * Artifact Service
 *
 * Creates and manages entitlement intelligence artifacts (zoning snapshots,
 * permit pathways, tripwire checklists, risk registers, kickoff packs).
 *
 * This service uses the SSL (Single Source of Logic) data layer for all
 * data access. The data layer handles fallbacks gracefully when data is
 * unavailable.
 */

import type { City } from "@/lib/cities";
import { geocodeAddress } from "@/lib/geo/geocode";
import { getArtifactStore } from "@/lib/storage/getArtifactStore";
import { makeSlug } from "@/lib/slug";
import type { ArtifactRecord } from "@/lib/artifacts/types";
import { getPool } from "@/lib/db/pool";
import { insertAddressIfConfigured } from "@/lib/services/addressesDb";
import { deriveOverlayFlags } from "@/lib/services/overlayFlags";

// Import from SSL data layer
import {
  getZoningSnapshot,
  getPermitPathway,
  getTripwireChecklist,
  type ZoningSnapshotData,
  type PermitPathwayData,
  type TripwireChecklistData,
} from "@/lib/data/entitlementDataService";
import { getZoneDisplayName } from "@/lib/data/zoneNameMappings";

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

  // Use SSL data service
  const zoningData = await getZoningSnapshot({
    city: input.city,
    lat: geocode.lat,
    lng: geocode.lng,
    use_type: input.use_type
  });

  // Build output from SSL data
  const output = {
    zoning_district: zoningData.zoning_district ?? {
      zone_code: "UNAVAILABLE",
      zone_name: "Zoning Data Not Available",
      ordinance_url: ""
    },
    allowed_uses: zoningData.allowed_uses,
    selected_use: zoningData.selected_use,
    height_limit: zoningData.height_limit,
    far: zoningData.far,
    lot_coverage_pct: zoningData.lot_coverage_pct,
    setbacks_ft: zoningData.setbacks_ft,
    parking: zoningData.parking,
    overlay_flags: zoningData.overlay_flags,
    red_flags: zoningData.red_flags,
    data_freshness: zoningData.data_freshness,
    disclaimer: zoningData.disclaimer,
    // Include availability indicator for UI
    data_availability: zoningData.availability
  };

  const zoneCodeForSlug = zoningData.zoning_district?.zone_code ?? "unknown";
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
  // Use SSL data service
  const permitData = await getPermitPathway({
    city: input.city,
    project_type: input.project_type
  });

  const output = {
    required_permits: permitData.required_permits,
    review_sequence: permitData.review_sequence,
    departments: permitData.departments,
    timeline_ranges: permitData.timeline_ranges,
    common_delays: permitData.common_delays,
    gating_items: permitData.gating_items,
    data_freshness: permitData.data_freshness,
    data_availability: permitData.availability
  };

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
  // Use SSL data service
  const tripwireData = await getTripwireChecklist({
    city: input.city,
    occupancy_type: input.occupancy_type
  });

  const output = {
    checklist: tripwireData.checklist,
    disclaimer: tripwireData.disclaimer,
    data_availability: tripwireData.availability
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
        // Skip generic "unavailable" flags
        if (String(flag).includes("not available")) continue;
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

  // Use SSL data service for all data
  const [zoningData, permitData, tripwireData] = await Promise.all([
    getZoningSnapshot({
      city: input.city,
      lat: geocode.lat,
      lng: geocode.lng,
      use_type: input.use_type
    }),
    getPermitPathway({
      city: input.city,
      project_type: input.project_type
    }),
    getTripwireChecklist({
      city: input.city,
      occupancy_type: input.occupancy_type
    })
  ]);

  // Build zoning output
  const zoning = {
    zoning_district: zoningData.zoning_district ?? {
      zone_code: "UNAVAILABLE",
      zone_name: "Zoning Data Not Available",
      ordinance_url: ""
    },
    allowed_uses: zoningData.allowed_uses,
    height_limit: zoningData.height_limit,
    far: zoningData.far,
    lot_coverage_pct: zoningData.lot_coverage_pct,
    setbacks_ft: zoningData.setbacks_ft,
    parking: zoningData.parking,
    overlay_flags: zoningData.overlay_flags,
    red_flags: zoningData.red_flags,
    data_freshness: zoningData.data_freshness,
    disclaimer: zoningData.disclaimer
  };

  // Build permit output
  const permits = {
    required_permits: permitData.required_permits,
    review_sequence: permitData.review_sequence,
    departments: permitData.departments,
    timeline_ranges: permitData.timeline_ranges,
    common_delays: permitData.common_delays,
    gating_items: permitData.gating_items
  };

  // Build tripwire output
  const tripwires = {
    checklist: tripwireData.checklist,
    disclaimer: tripwireData.disclaimer
  };

  // Build risk items from zoning flags (filter out generic unavailable messages)
  const riskFromZoning = (zoning.red_flags ?? [])
    .filter((flag) => !String(flag).includes("not available"))
    .map((flag) => ({
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

  // Build ambiguities based on data availability
  const knownAmbiguities: string[] = [];
  if (zoningData.availability !== "available") {
    knownAmbiguities.push("Zoning data incomplete - verify with local planning department");
  }
  if (permitData.availability !== "available") {
    knownAmbiguities.push("Permit timeline data not available - contact building department");
  }
  knownAmbiguities.push("Confirm intended occupancy and occupant load");
  knownAmbiguities.push("Confirm parking reductions applicability");

  const output = {
    contents: {
      zoning_snapshot: zoning,
      permit_pathway: permits,
      tripwire_checklist: tripwires,
      risk_register: { items: riskItems, cta: "Track in Part3" },
      known_ambiguities: knownAmbiguities
    },
    data_availability: {
      zoning: zoningData.availability,
      permits: permitData.availability,
      tripwires: tripwireData.availability
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
