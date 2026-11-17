/**
 * Enforcement units. The programme formerly called "Park Monitors" is now the
 * Special Enforcement Unit, which sits alongside the Recovery Unit and the
 * Park Monitors. The stored value is a stable code; the first entry is the
 * default an applicant starts with. An HOD can move a person to another unit
 * when grouping them.
 */
export const ENFORCEMENT_TYPES = [
  { value: "SPECIAL_ENFORCEMENT_UNIT", label: "Special Enforcement Unit" },
  { value: "RECOVERY_UNIT", label: "Recovery Unit" },
  { value: "PARK_MONITORS", label: "Park Monitors" },
] as const;

export type EnforcementType = (typeof ENFORCEMENT_TYPES)[number]["value"];

export const DEFAULT_ENFORCEMENT_TYPE: EnforcementType =
  ENFORCEMENT_TYPES[0].value;

/** A unit group needs at least this many members, and may not drop below it. */
export const ENFORCEMENT_GROUP_MIN_MEMBERS = 5;

export function isEnforcementType(v: unknown): v is EnforcementType {
  return ENFORCEMENT_TYPES.some((t) => t.value === v);
}

export function enforcementTypeLabel(v: string | null | undefined): string {
  return (
    ENFORCEMENT_TYPES.find((t) => t.value === v)?.label ??
    "Special Enforcement Unit"
  );
}
