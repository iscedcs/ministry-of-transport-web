/**
 * CVR (Commercial Vehicle Registration) — permission helpers.
 *
 * Base write roles are ENUMERATOR, ADMIN, SYSTEM_ADMIN.
 * System Admin can extend access at runtime via the SystemConfiguration
 * keys "cvr.access.extraRoles" and "cvr.vin.roles".
 *
 * This file is NOT server-only so the sidebar (client component) can
 * import the base constant for initial rendering; the async helpers that
 * read SystemConfiguration are only called from server-side code.
 */

import type { UserRole } from "@prisma/client";

/**
 * Roles that always have CVR read/write access regardless of system config.
 */
export const CVR_BASE_WRITE_ROLES: UserRole[] = [
  "ENUMERATOR",
  "ADMIN",
  "SYSTEM_ADMIN",
];

/**
 * Roles that always have view access (superset of write roles).
 * View-only roles cannot mutate records but can see the list and detail pages.
 */
export const CVR_BASE_VIEW_ROLES: UserRole[] = [
  ...CVR_BASE_WRITE_ROLES,
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS",
];

// ─── Server-only helpers (call these from Server Actions / Server Components) ─

/**
 * Parses a comma-separated role string from SystemConfiguration
 * and filters to valid UserRole values.
 */
function parseRoleString(raw: string): UserRole[] {
  const ALL_ROLES = new Set<string>([
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "HOD_PARKS",
    "HOD_VIS",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "FIELD_INSPECTOR",
    "FINANCE_OFFICER",
    "VEHICLE_INSPECTION_OFFICER",
    "EXTERNAL_APPLICANT",
    "PARK_MONITOR",
    "SYSTEM_ADMIN",
    "ADMIN",
    "ICT_OFFICER",
    "ICT_OFFICER_TRACAS",
    "ENUMERATOR",
    "TRACAS_MD",
  ]);

  return raw
    .split(",")
    .map((r) => r.trim())
    .filter((r) => ALL_ROLES.has(r)) as UserRole[];
}

/**
 * Returns the effective set of roles that can write CVR records.
 * Merges CVR_BASE_WRITE_ROLES with any roles from "cvr.access.extraRoles".
 */
export async function getCvrWriteRoles(): Promise<UserRole[]> {
  const { getTextSetting } = await import("@/lib/system-config");
  const raw = await getTextSetting("cvr.access.extraRoles");
  const extra = parseRoleString(raw);
  const merged = new Set([...CVR_BASE_WRITE_ROLES, ...extra]);
  return Array.from(merged);
}

/**
 * Returns the effective set of roles that can VIEW CVR records.
 * Merges CVR_BASE_VIEW_ROLES with any roles from "cvr.access.extraRoles".
 */
export async function getCvrViewRoles(): Promise<UserRole[]> {
  const { getTextSetting } = await import("@/lib/system-config");
  const raw = await getTextSetting("cvr.access.extraRoles");
  const extra = parseRoleString(raw);
  const merged = new Set([...CVR_BASE_VIEW_ROLES, ...extra]);
  return Array.from(merged);
}

/**
 * Returns the effective set of roles that can assign a VIN (Stage 2).
 * SYSTEM_ADMIN always has this permission.
 */
export async function getCvrVinRoles(): Promise<UserRole[]> {
  const { getTextSetting } = await import("@/lib/system-config");
  const raw = await getTextSetting("cvr.vin.roles");
  const configured = parseRoleString(raw);
  const merged = new Set<UserRole>(["SYSTEM_ADMIN", ...configured]);
  return Array.from(merged);
}

/**
 * Synchronous check for sidebar rendering — uses only the base list.
 * For accurate access control, server actions must call getCvrWriteRoles().
 */
export function canWriteCvrSync(role: UserRole | string | null): boolean {
  return !!role && (CVR_BASE_WRITE_ROLES as string[]).includes(role);
}
