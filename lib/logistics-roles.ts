/**
 * Logistics registration — permission helpers.
 *
 * Chain is HOD Operations -> Permanent Secretary -> Commissioner. There is no
 * HOD Parks Revalidation stage here, unlike mass transit and motor parks —
 * the Ministry's instruction for this module left it out.
 */

import type { UserRole } from "@prisma/client";

export const LOGISTICS_BASE_WRITE_ROLES: UserRole[] = [
  "ENUMERATOR",
  "ADMIN",
  "SYSTEM_ADMIN",
];

export const LOGISTICS_BASE_VIEW_ROLES: UserRole[] = [
  ...LOGISTICS_BASE_WRITE_ROLES,
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "HOD_TRANSPORT_OPS",
];

export const LOGISTICS_HOD_OPS_ROLES: UserRole[] = [
  "HOD_TRANSPORT_OPS",
  "SYSTEM_ADMIN",
];

export const LOGISTICS_PS_ROLES: UserRole[] = [
  "PERMANENT_SECRETARY",
  "SYSTEM_ADMIN",
];

export const LOGISTICS_COMMISSIONER_ROLES: UserRole[] = [
  "COMMISSIONER",
  "SYSTEM_ADMIN",
];

/** Any of the three approval stages — for the reject action. */
export const LOGISTICS_APPROVAL_ROLES: UserRole[] = [
  "HOD_TRANSPORT_OPS",
  "PERMANENT_SECRETARY",
  "COMMISSIONER",
  "SYSTEM_ADMIN",
];

/**
 * Who can edit a logistics record. Wider than who can register one — a
 * reviewer who spots a mistake at their own stage should be able to fix it
 * without kicking the whole application back to the enumerator.
 */
export const LOGISTICS_EDIT_ROLES: UserRole[] = [
  ...new Set([...LOGISTICS_BASE_WRITE_ROLES, ...LOGISTICS_APPROVAL_ROLES]),
];

export function canWriteLogisticsSync(role: UserRole | string | null): boolean {
  return !!role && (LOGISTICS_BASE_WRITE_ROLES as string[]).includes(role);
}
