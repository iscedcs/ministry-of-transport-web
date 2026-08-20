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
 * ADMIN is the Anambra team lead: they correct records across every module so
 * that day to day fixes no longer require the System Administrator account.
 * They still approve nothing — see lib/account-policy.ts.
 */
export const FLEET_WRITE_ROLES: UserRole[] = [
  "ENUMERATOR",
  "COMMISSIONER",
  "SYSTEM_ADMIN",
  "ADMIN",
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

/**
 * Roles that may amend a driver's profile.
 *
 * Narrower than FLEET_WRITE_ROLES: a driver's details are printed on an ID
 * card and named on a Letter of Authority, so the Commissioner — who approves
 * those documents — does not also edit what they approve. The Enumerator who
 * captured the driver corrects their own work; the two administrative roles
 * correct anyone's.
 */
export const DRIVER_EDIT_ROLES: UserRole[] = [
  "ENUMERATOR",
  "SYSTEM_ADMIN",
  "ADMIN",
];

/** True when the role may amend a driver's profile. */
export function canEditDriver(role: UserRole | string | null): boolean {
  return !!role && (DRIVER_EDIT_ROLES as string[]).includes(role);
}

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
