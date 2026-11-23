/**
 * Enforcement units. The programme formerly called "Park Monitors" is now run
 * as four units: Transport Compliance, Special Enforcement, Retriever, and
 * Park Monitoring. The stored value is a stable code. An applicant starts on
 * DEFAULT_ENFORCEMENT_TYPE; an HOD can move a person to another unit when
 * grouping them.
 *
 * The order here is the order the dropdowns show.
 */
export const ENFORCEMENT_TYPES = [
  { value: "TRANSPORT_COMPLIANCE_UNIT", label: "Transport Compliance Unit" },
  { value: "SPECIAL_ENFORCEMENT_UNIT", label: "Special Enforcement Unit" },
  { value: "RETRIEVER_UNIT", label: "Retriever Unit" },
  { value: "PARK_MONITORING_UNIT", label: "Park Monitoring Unit" },
] as const;

export type EnforcementType = (typeof ENFORCEMENT_TYPES)[number]["value"];

/**
 * What a new application starts on. Named, not "the first in the list", so
 * reordering the dropdown never changes it.
 */
export const DEFAULT_ENFORCEMENT_TYPE: EnforcementType =
  "SPECIAL_ENFORCEMENT_UNIT";

/**
 * Codes used by an earlier version of the list. Rows saved under them still
 * show the right unit name; run scripts/rename-enforcement-units.ts to rewrite
 * them in the database.
 */
export const LEGACY_ENFORCEMENT_TYPES: Record<string, EnforcementType> = {
  RECOVERY_UNIT: "RETRIEVER_UNIT",
  PARK_MONITORS: "PARK_MONITORING_UNIT",
};

/** A unit group needs at least this many members, and may not drop below it. */
export const ENFORCEMENT_GROUP_MIN_MEMBERS = 5;

export function isEnforcementType(v: unknown): v is EnforcementType {
  return ENFORCEMENT_TYPES.some((t) => t.value === v);
}

export function enforcementTypeLabel(v: string | null | undefined): string {
  const code = (v && LEGACY_ENFORCEMENT_TYPES[v]) || v;
  return (
    ENFORCEMENT_TYPES.find((t) => t.value === code)?.label ??
    "Special Enforcement Unit"
  );
}
