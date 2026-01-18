/**
 * DEPRECATED: Mock Tripwire Data
 *
 * This file previously contained hard-coded tripwire data used as fallback.
 * The tripwire definitions have been moved to TripwireDefinitions in
 * @/lib/services/tripwireDefinitions.ts
 *
 * DO NOT USE THIS FILE FOR NEW CODE.
 * Use `@/lib/data/entitlementDataService` instead.
 *
 * This file now returns tripwires from TripwireDefinitions with "Not Checked" status.
 */

import type { City } from "@/lib/cities";
import { TripwireDefinitions } from "@/lib/services/tripwireDefinitions";

export type TripwireStatus = "Pass" | "Likely Issue" | "Unknown" | "Not Checked";

export type TripwireItem = {
  check_name: string;
  label: string;
  why_it_matters: string;
  code_reference: string;
  status: TripwireStatus;
};

/**
 * Returns tripwire checklist based on TripwireDefinitions.
 * This function is called when database data is not available.
 *
 * @deprecated Use getTripwireChecklist from @/lib/data/entitlementDataService instead
 */
export function mockTripwireChecklist(_city: City, _occupancyType: string): TripwireItem[] {
  // Use the centralized TripwireDefinitions - these are IBC code checks, not fake data
  return TripwireDefinitions.map((t) => ({
    check_name: t.check_name,
    label: t.label,
    why_it_matters: t.why,
    code_reference: t.ref,
    status: "Not Checked" as TripwireStatus
  }));
}

