export const TripwireDefinitions = [
  { check_name: "corridor_width", label: "Corridor width", why: "Most common commercial RFI", ref: "IBC 1020.2" },
  { check_name: "egress_travel_distance", label: "Egress travel distance", why: "Determines exit count/placement", ref: "IBC 1017.1" },
  { check_name: "exit_separation", label: "Exit separation", why: "Fails plan check if too close", ref: "IBC 1007.1.1" },
  { check_name: "door_clearances_ada", label: "Door clearances (ADA)", why: "Accessibility requirement", ref: "ADA 404.2.4" },
  { check_name: "stair_geometry", label: "Stair geometry", why: "Riser/tread dimensions, handrail", ref: "IBC 1011" },
  { check_name: "fire_separation", label: "Fire separation", why: "Rated assemblies between occupancies", ref: "IBC Table 508.4" },
  { check_name: "occupant_load", label: "Occupant load", why: "Drives egress requirements", ref: "IBC Table 1004.5" },
  { check_name: "plumbing_fixture_count", label: "Plumbing fixture count", why: "Often under-counted early", ref: "IPC Table 403.1" },
  { check_name: "shaft_enclosures", label: "Shaft enclosures", why: "Stair/elevator shaft rating", ref: "IBC 713" },
  { check_name: "exterior_wall_openings", label: "Exterior wall openings", why: "Fire separation distance impact", ref: "IBC Table 705.8" }
] as const;

