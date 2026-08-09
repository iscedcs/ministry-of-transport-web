/**
 * Fleet (TRACAS / Boats) permission sets.
 *
 * Deliberately NOT in lib/auth.ts: that module is "server-only", but the
 * dashboards need the same rules to decide which controls to render. Keeping
 * the sets here lets server actions and client components share one source of
 * truth instead of drifting apart.
 */

import type { UserRole } from "@prisma/client";

/**
 * Roles that may CREATE or MODIFY fleet records — onboarding vehicles,
 * drivers, boats and riders, and binding stickers.
 *
 * Onboarding is the Enumerator's job. Everyone else with fleet visibility
 * (PS, the HODs, the TRACAS MD, inspectors) is read-only: they review and
 * approve, they do not enter data.
 *
 * TODO: add the ADMIN role here once it is created.
 */
export const FLEET_WRITE_ROLES: UserRole[] = [
  "ENUMERATOR",
  "COMMISSIONER",
  "SYSTEM_ADMIN",
];

/** Roles that may VIEW fleet records without being able to change them. */
export const FLEET_VIEW_ROLES: UserRole[] = [
  ...FLEET_WRITE_ROLES,
  "PERMANENT_SECRETARY",
  "HOD_PARKS",
  "HOD_VIS",
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS_REVALIDATION",
  "FIELD_INSPECTOR",
  "TRACAS_MD",
];

/**
 * Editing an onboarded vehicle carries the same authority as creating one, so
 * it shares FLEET_WRITE_ROLES rather than maintaining a parallel list that
 * could drift out of step.
 */
export const FLEET_EDIT_ROLES: UserRole[] = FLEET_WRITE_ROLES;

/** True when the role may create or modify fleet records. */
export function canWriteFleet(role: UserRole | string | null): boolean {
  return !!role && (FLEET_WRITE_ROLES as string[]).includes(role);
}

/** True when the role may amend an existing vehicle record. */
export function canEditFleet(role: UserRole | string | null): boolean {
  return canWriteFleet(role);
}

/** True when the role may view fleet records. */
export function canViewFleet(role: UserRole | string | null): boolean {
  return !!role && (FLEET_VIEW_ROLES as string[]).includes(role);
}
