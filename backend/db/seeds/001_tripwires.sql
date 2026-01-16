INSERT INTO code_tripwires (check_name, occupancy_type, city, requirement, code_reference, check_logic, common_issue)
VALUES
  -- Business
  ('corridor_width', 'business', NULL, 'Minimum 44 inches clear width for occupant load ≤50', 'IBC 1020.2', '{"thresholds":{"pass":">= 44","warning":"42-43","fail":"< 42"}}', 'Often designed at 42" which fails plan check'),
  ('egress_travel_distance', 'business', NULL, 'Egress travel distance must be within limits for the chosen occupancy', 'IBC 1017.1', '{}', 'Early layouts ignore travel distance and require rework'),
  ('exit_separation', 'business', NULL, 'Exit separation must meet minimum diagonal separation requirements', 'IBC 1007.1.1', '{}', 'Exits placed too close triggers plan check comments'),
  ('door_clearances_ada', 'business', NULL, 'ADA door maneuvering clearances must be satisfied at key doors', 'ADA 404.2.4', '{}', 'Door swings and adjacent walls reduce clearances'),
  ('stair_geometry', 'business', NULL, 'Stair riser/tread/handrail geometry must meet code', 'IBC 1011', '{}', 'Riser/tread mismatches require redesign'),
  ('fire_separation', 'business', NULL, 'Occupancy separations must meet required fire-resistance ratings', 'IBC Table 508.4', '{}', 'Mixed occupancies miss rated assemblies early'),
  ('occupant_load', 'business', NULL, 'Occupant load must be calculated using the correct factors', 'IBC Table 1004.5', '{}', 'Understated occupant load cascades into egress failures'),
  ('plumbing_fixture_count', 'business', NULL, 'Plumbing fixture counts must meet minimums', 'IPC Table 403.1', '{}', 'Counts are often under-scoped early'),
  ('shaft_enclosures', 'business', NULL, 'Shaft enclosures require specific ratings and continuity', 'IBC 713', '{}', 'Shaft penetrations and ratings missed until review'),
  ('exterior_wall_openings', 'business', NULL, 'Exterior wall opening limits depend on fire separation distance', 'IBC Table 705.8', '{}', 'Window-to-lot-line constraints discovered late'),

  -- Assembly
  ('corridor_width', 'assembly', NULL, 'Minimum 44 inches clear width for occupant load ≤50', 'IBC 1020.2', '{"thresholds":{"pass":">= 44","warning":"42-43","fail":"< 42"}}', 'Often designed at 42" which fails plan check'),
  ('egress_travel_distance', 'assembly', NULL, 'Egress travel distance must be within limits for the chosen occupancy', 'IBC 1017.1', '{}', 'Early layouts ignore travel distance and require rework'),
  ('exit_separation', 'assembly', NULL, 'Exit separation must meet minimum diagonal separation requirements', 'IBC 1007.1.1', '{}', 'Exits placed too close triggers plan check comments'),
  ('door_clearances_ada', 'assembly', NULL, 'ADA door maneuvering clearances must be satisfied at key doors', 'ADA 404.2.4', '{}', 'Door swings and adjacent walls reduce clearances'),
  ('stair_geometry', 'assembly', NULL, 'Stair riser/tread/handrail geometry must meet code', 'IBC 1011', '{}', 'Riser/tread mismatches require redesign'),
  ('fire_separation', 'assembly', NULL, 'Occupancy separations must meet required fire-resistance ratings', 'IBC Table 508.4', '{}', 'Mixed occupancies miss rated assemblies early'),
  ('occupant_load', 'assembly', NULL, 'Occupant load must be calculated using the correct factors', 'IBC Table 1004.5', '{}', 'Understated occupant load cascades into egress failures'),
  ('plumbing_fixture_count', 'assembly', NULL, 'Plumbing fixture counts must meet minimums', 'IPC Table 403.1', '{}', 'Counts are often under-scoped early'),
  ('shaft_enclosures', 'assembly', NULL, 'Shaft enclosures require specific ratings and continuity', 'IBC 713', '{}', 'Shaft penetrations and ratings missed until review'),
  ('exterior_wall_openings', 'assembly', NULL, 'Exterior wall opening limits depend on fire separation distance', 'IBC Table 705.8', '{}', 'Window-to-lot-line constraints discovered late'),

  -- Educational
  ('corridor_width', 'educational', NULL, 'Minimum 44 inches clear width for occupant load ≤50', 'IBC 1020.2', '{"thresholds":{"pass":">= 44","warning":"42-43","fail":"< 42"}}', 'Often designed at 42" which fails plan check'),
  ('egress_travel_distance', 'educational', NULL, 'Egress travel distance must be within limits for the chosen occupancy', 'IBC 1017.1', '{}', 'Early layouts ignore travel distance and require rework'),
  ('exit_separation', 'educational', NULL, 'Exit separation must meet minimum diagonal separation requirements', 'IBC 1007.1.1', '{}', 'Exits placed too close triggers plan check comments'),
  ('door_clearances_ada', 'educational', NULL, 'ADA door maneuvering clearances must be satisfied at key doors', 'ADA 404.2.4', '{}', 'Door swings and adjacent walls reduce clearances'),
  ('stair_geometry', 'educational', NULL, 'Stair riser/tread/handrail geometry must meet code', 'IBC 1011', '{}', 'Riser/tread mismatches require redesign'),
  ('fire_separation', 'educational', NULL, 'Occupancy separations must meet required fire-resistance ratings', 'IBC Table 508.4', '{}', 'Mixed occupancies miss rated assemblies early'),
  ('occupant_load', 'educational', NULL, 'Occupant load must be calculated using the correct factors', 'IBC Table 1004.5', '{}', 'Understated occupant load cascades into egress failures'),
  ('plumbing_fixture_count', 'educational', NULL, 'Plumbing fixture counts must meet minimums', 'IPC Table 403.1', '{}', 'Counts are often under-scoped early'),
  ('shaft_enclosures', 'educational', NULL, 'Shaft enclosures require specific ratings and continuity', 'IBC 713', '{}', 'Shaft penetrations and ratings missed until review'),
  ('exterior_wall_openings', 'educational', NULL, 'Exterior wall opening limits depend on fire separation distance', 'IBC Table 705.8', '{}', 'Window-to-lot-line constraints discovered late'),

  -- Healthcare
  ('corridor_width', 'healthcare', NULL, 'Minimum 44 inches clear width for occupant load ≤50', 'IBC 1020.2', '{"thresholds":{"pass":">= 44","warning":"42-43","fail":"< 42"}}', 'Often designed at 42" which fails plan check'),
  ('egress_travel_distance', 'healthcare', NULL, 'Egress travel distance must be within limits for the chosen occupancy', 'IBC 1017.1', '{}', 'Early layouts ignore travel distance and require rework'),
  ('exit_separation', 'healthcare', NULL, 'Exit separation must meet minimum diagonal separation requirements', 'IBC 1007.1.1', '{}', 'Exits placed too close triggers plan check comments'),
  ('door_clearances_ada', 'healthcare', NULL, 'ADA door maneuvering clearances must be satisfied at key doors', 'ADA 404.2.4', '{}', 'Door swings and adjacent walls reduce clearances'),
  ('stair_geometry', 'healthcare', NULL, 'Stair riser/tread/handrail geometry must meet code', 'IBC 1011', '{}', 'Riser/tread mismatches require redesign'),
  ('fire_separation', 'healthcare', NULL, 'Occupancy separations must meet required fire-resistance ratings', 'IBC Table 508.4', '{}', 'Mixed occupancies miss rated assemblies early'),
  ('occupant_load', 'healthcare', NULL, 'Occupant load must be calculated using the correct factors', 'IBC Table 1004.5', '{}', 'Understated occupant load cascades into egress failures'),
  ('plumbing_fixture_count', 'healthcare', NULL, 'Plumbing fixture counts must meet minimums', 'IPC Table 403.1', '{}', 'Counts are often under-scoped early'),
  ('shaft_enclosures', 'healthcare', NULL, 'Shaft enclosures require specific ratings and continuity', 'IBC 713', '{}', 'Shaft penetrations and ratings missed until review'),
  ('exterior_wall_openings', 'healthcare', NULL, 'Exterior wall opening limits depend on fire separation distance', 'IBC Table 705.8', '{}', 'Window-to-lot-line constraints discovered late'),

  -- Mercantile
  ('corridor_width', 'mercantile', NULL, 'Minimum 44 inches clear width for occupant load ≤50', 'IBC 1020.2', '{"thresholds":{"pass":">= 44","warning":"42-43","fail":"< 42"}}', 'Often designed at 42" which fails plan check'),
  ('egress_travel_distance', 'mercantile', NULL, 'Egress travel distance must be within limits for the chosen occupancy', 'IBC 1017.1', '{}', 'Early layouts ignore travel distance and require rework'),
  ('exit_separation', 'mercantile', NULL, 'Exit separation must meet minimum diagonal separation requirements', 'IBC 1007.1.1', '{}', 'Exits placed too close triggers plan check comments'),
  ('door_clearances_ada', 'mercantile', NULL, 'ADA door maneuvering clearances must be satisfied at key doors', 'ADA 404.2.4', '{}', 'Door swings and adjacent walls reduce clearances'),
  ('stair_geometry', 'mercantile', NULL, 'Stair riser/tread/handrail geometry must meet code', 'IBC 1011', '{}', 'Riser/tread mismatches require redesign'),
  ('fire_separation', 'mercantile', NULL, 'Occupancy separations must meet required fire-resistance ratings', 'IBC Table 508.4', '{}', 'Mixed occupancies miss rated assemblies early'),
  ('occupant_load', 'mercantile', NULL, 'Occupant load must be calculated using the correct factors', 'IBC Table 1004.5', '{}', 'Understated occupant load cascades into egress failures'),
  ('plumbing_fixture_count', 'mercantile', NULL, 'Plumbing fixture counts must meet minimums', 'IPC Table 403.1', '{}', 'Counts are often under-scoped early'),
  ('shaft_enclosures', 'mercantile', NULL, 'Shaft enclosures require specific ratings and continuity', 'IBC 713', '{}', 'Shaft penetrations and ratings missed until review'),
  ('exterior_wall_openings', 'mercantile', NULL, 'Exterior wall opening limits depend on fire separation distance', 'IBC Table 705.8', '{}', 'Window-to-lot-line constraints discovered late')
ON CONFLICT DO NOTHING;
