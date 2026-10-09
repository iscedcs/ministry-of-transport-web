/**
 * Towing Van registration — permission helpers.
 *
 * Base write roles register the van. Issuing the permit is a separate,
 * narrower action — the Commissioner signs it, the Permanent Secretary can
 * stand in, same as other executive sign-offs on this platform.
 */

import type { UserRole } from "@prisma/client";

export const TOWING_BASE_WRITE_ROLES: UserRole[] = [
  "ENUMERATOR",
  "ADMIN",
  "SYSTEM_ADMIN",
];

export const TOWING_BASE_VIEW_ROLES: UserRole[] = [
  ...TOWING_BASE_WRITE_ROLES,
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "HOD_TRANSPORT_OPS",
];

export const TOWING_ISSUE_ROLES: UserRole[] = [
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "SYSTEM_ADMIN",
];

export function canWriteTowingSync(role: UserRole | string | null): boolean {
  return !!role && (TOWING_BASE_WRITE_ROLES as string[]).includes(role);
}
