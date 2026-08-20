/**
 * The facilities the Ministry recognises at a park or terminal.
 *
 * One list, shared by the revalidation form and the mass transit application,
 * so the two cannot drift apart — an inspector verifying a terminal against a
 * different list from the one the operator declared against is how disputes
 * start.
 *
 * Stored as { [facility]: boolean } in the facilitiesAvailable JSON column on
 * both RevalidationApplication and MassTransitCompany. Absent means the
 * operator did not claim it, which is not the same as claiming it is absent —
 * hence the tri-state rendering wherever these are shown.
 */
export const FACILITY_ITEMS = [
  "Perimeter Fence",
  "Security Post",
  "Toilet Facilities",
  "Borehole/Water Supply",
  "Passenger Waiting Area",
  "Loading Bay",
  "Fire Extinguishers",
  "CCTV Cameras",
  "Solar/Street Lights",
  "Ticketing Point",
  "Manager/Admin Office",
] as const;

export type FacilityItem = (typeof FACILITY_ITEMS)[number];
