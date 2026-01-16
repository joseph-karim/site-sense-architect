import type { City } from "@/lib/cities";

export type TripwireStatus = "Pass" | "Likely Issue" | "Unknown" | "Not Checked";

export type TripwireItem = {
  check_name: string;
  label: string;
  why_it_matters: string;
  code_reference: string;
  status: TripwireStatus;
};

export function mockTripwireChecklist(_city: City, _occupancyType: string): TripwireItem[] {
  return [
    { check_name: "corridor_width", label: "Corridor width", why_it_matters: "Most common commercial RFI", code_reference: "IBC 1020.2", status: "Unknown" },
    { check_name: "egress_travel_distance", label: "Egress travel distance", why_it_matters: "Determines exit count/placement", code_reference: "IBC 1017.1", status: "Unknown" },
    { check_name: "exit_separation", label: "Exit separation", why_it_matters: "Fails plan check if too close", code_reference: "IBC 1007.1.1", status: "Unknown" },
    { check_name: "door_clearances_ada", label: "Door clearances (ADA)", why_it_matters: "Accessibility requirement", code_reference: "ADA 404.2.4", status: "Unknown" },
    { check_name: "stair_geometry", label: "Stair geometry", why_it_matters: "Riser/tread, handrail", code_reference: "IBC 1011", status: "Unknown" },
    { check_name: "fire_separation", label: "Fire separation", why_it_matters: "Rated assemblies between occupancies", code_reference: "IBC Table 508.4", status: "Unknown" },
    { check_name: "occupant_load", label: "Occupant load", why_it_matters: "Drives egress requirements", code_reference: "IBC Table 1004.5", status: "Unknown" },
    { check_name: "plumbing_fixture_count", label: "Plumbing fixture count", why_it_matters: "Often under-counted early", code_reference: "IPC Table 403.1", status: "Unknown" },
    { check_name: "shaft_enclosures", label: "Shaft enclosures", why_it_matters: "Stair/elevator shaft rating", code_reference: "IBC 713", status: "Unknown" },
    { check_name: "exterior_wall_openings", label: "Exterior wall openings", why_it_matters: "Fire separation distance impact", code_reference: "IBC Table 705.8", status: "Unknown" }
  ];
}

