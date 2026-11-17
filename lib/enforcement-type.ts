/**
 * Enforcement unit a park-monitor-style applicant is joining.
 *
 * The programme formerly called "Park Monitors" is now the Special
 * Enforcement Unit. The stored value is a stable code; add new units here.
 * The first entry is the default.
 */
export const ENFORCEMENT_TYPES = [
  { value: "SPECIAL_ENFORCEMENT_UNIT", label: "Special Enforcement Unit" },
] as const;

export type EnforcementType = (typeof ENFORCEMENT_TYPES)[number]["value"];

export const DEFAULT_ENFORCEMENT_TYPE: EnforcementType =
  ENFORCEMENT_TYPES[0].value;

export function isEnforcementType(v: unknown): v is EnforcementType {
  return ENFORCEMENT_TYPES.some((t) => t.value === v);
}

export function enforcementTypeLabel(v: string | null | undefined): string {
  return ENFORCEMENT_TYPES.find((t) => t.value === v)?.label ?? "Special Enforcement Unit";
}
