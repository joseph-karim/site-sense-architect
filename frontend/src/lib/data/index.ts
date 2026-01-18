/**
 * Data Layer - Single Source of Logic (SSL)
 *
 * This directory contains the centralized data access layer for the application.
 * All data flows through these modules.
 *
 * Architecture:
 * - entitlementDataService.ts: Core service for zoning, permits, and tripwires
 * - zoneNameMappings.ts: Zone code to human-readable name mappings
 */

// Core data service
export {
  getZoningSnapshot,
  getZoningByCode,
  getPermitPathway,
  getTripwireChecklist,
  getZoneListForCity,
  checkDataAvailability,
  type ZoningSnapshotData,
  type PermitPathwayData,
  type TripwireChecklistData,
  type ZoneListItem,
  type DataAvailability,
} from "./entitlementDataService";

// Zone name mappings
export {
  getZoneDisplayName,
  getZoneCategory,
  enrichZoneIndex,
  type ZoneNameMapping,
} from "./zoneNameMappings";
