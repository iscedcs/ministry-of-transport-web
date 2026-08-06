/**
 * Auth Helpers — Ministry of Transport Platform
 * Reference: docs/ROLES_AND_DUTIES.md | docs/EPICS.md (STORY-006)
 *
 * Server-side helpers for:
 *  - Reading the current session in Server Components and Server Actions
 *  - Enforcing authentication (redirect to /login if unauthenticated)
 *  - Enforcing role-based access (throw or redirect if insufficient role)
 *
 * Usage in Server Components:     const session = await getSession()
 * Usage in Server Actions:        const ctx = await requireAuth()
 * Usage for role guard:           await requireRole(["COMMISSIONER", "PERMANENT_SECRETARY"])
 */
import "server-only";

import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getSessionFromCookie, type SessionPayload } from "./session";

// ==================== ROLE GROUPS ====================
// Reference: docs/ROLES_AND_DUTIES.md

/** All Ministry staff roles (internal users provisioned by PS / Admin) */
export const MINISTRY_ROLES: UserRole[] = (Object.keys(UserRole) as UserRole[]).filter(
  (r) => r !== "EXTERNAL_APPLICANT"
);

/** Roles with executive approval authority (Commissioner + PS) */
export const EXECUTIVE_ROLES: UserRole[] = [
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
];

/** All HOD roles */
export const HOD_ROLES: UserRole[] = [
  "HOD_PARKS",
  "HOD_VIS",
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS_REVALIDATION",
];

/** Roles that can manage system configuration */
export const ADMIN_ROLES: UserRole[] = ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"];

// ==================== SESSION ACCESSORS ====================

/**
 * Get the current session payload (or null).
 * Safe to call in Server Components and Server Actions.
 * Does NOT redirect — returns null if unauthenticated.
 */
export async function getSession(): Promise<SessionPayload | null> {
  return getSessionFromCookie();
}

/**
 * Require authentication. Redirects to /login if no valid session.
 * Call at the top of any Server Action or Server Component that needs auth.
 *
 * @returns The current session payload (guaranteed non-null)
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Require a specific role (or one of several roles).
 * Redirects to /login if unauthenticated; to /unauthorized if wrong role.
 * Reference: docs/ROLES_AND_DUTIES.md — role permissions matrix
 *
 * @param allowedRoles  - List of UserRole values that may proceed
 * @returns The current session payload
 */
export async function requireRole(
  allowedRoles: UserRole[],
): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    redirect("/unauthorized");
  }
  return session;
}

/**
 * Require the user to be a Ministry staff member (not an external applicant).
 * Redirects to /unauthorized if the user is EXTERNAL_APPLICANT.
 */
export async function requireMinistryStaff(): Promise<SessionPayload> {
  return requireRole(MINISTRY_ROLES);
}

/**
 * Require Commissioner or Permanent Secretary authority.
 * Used for final approvals: permit issuance, revocation, staff management.
 */
export async function requireExecutive(): Promise<SessionPayload> {
  return requireRole(EXECUTIVE_ROLES);
}

/**
 * Require an HOD or higher role.
 * Used for inspection scheduling and workflow routing.
 */
export async function requireHodOrAbove(): Promise<SessionPayload> {
  return requireRole([...EXECUTIVE_ROLES, ...HOD_ROLES, "SYSTEM_ADMIN"]);
}

// ==================== FLEET (TRACAS / BOATS) PERMISSIONS ====================
// Defined in lib/fleet-roles.ts so the client dashboards can share them —
// this module is server-only. Re-exported here for server-side callers.

export {
  FLEET_WRITE_ROLES,
  FLEET_VIEW_ROLES,
  canWriteFleet,
} from "./fleet-roles";

// ==================== NON-REDIRECTING AUTHORIZATION ====================

export type AuthzResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; error: string };

/**
 * Role check that RETURNS a failure instead of redirecting.
 *
 * requireRole() calls redirect(), which is right for pages but wrong for
 * server actions invoked from a modal — the user gets thrown to /unauthorized
 * mid-flow instead of seeing a toast. Actions that return
 * { success, error } shapes should use this.
 */
export async function authorize(
  allowedRoles: UserRole[],
): Promise<AuthzResult> {
  const session = await getSessionFromCookie();
  if (!session) {
    return { ok: false, error: "You must be signed in to perform this action." };
  }
  if (!allowedRoles.includes(session.role)) {
    return {
      ok: false,
      error: "You do not have permission to perform this action.",
    };
  }
  return { ok: true, session };
}

// ==================== PERMISSION CHECKS ====================

/**
 * Check if a role can approve/issue permits.
 * Reference: docs/ROLES_AND_DUTIES.md — Commissioner + PS have permit authority
 */
export function canIssuePermits(role: UserRole): boolean {
  return EXECUTIVE_ROLES.includes(role);
}

/**
 * Check if a role can schedule inspections.
 * Reference: docs/ROLES_AND_DUTIES.md — HODs schedule inspections for their dept
 */
export function canScheduleInspections(role: UserRole): boolean {
  return [...EXECUTIVE_ROLES, ...HOD_ROLES].includes(role);
}

/**
 * Check if a role can perform (enter findings for) inspections.
 * Reference: docs/ROLES_AND_DUTIES.md — Field Inspectors and VIOs
 */
export function canPerformInspections(role: UserRole): boolean {
  return (
    role === "FIELD_INSPECTOR" ||
    role === "VEHICLE_INSPECTION_OFFICER" ||
    EXECUTIVE_ROLES.includes(role)
  );
}

/**
 * Check if a role can manage Ministry staff accounts.
 * Reference: docs/ROLES_AND_DUTIES.md — PS manages all staff accounts
 */
export function canManageStaff(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Check if a role can view the full audit trail.
 * Reference: docs/ROLES_AND_DUTIES.md — Commissioner + PS: all; HODs: dept only
 */
export function canViewFullAuditTrail(role: UserRole): boolean {
  return [...EXECUTIVE_ROLES, "SYSTEM_ADMIN"].includes(role);
}

/**
 * Check if the user owns (or can admin) an application.
 * External applicants can only act on their own applications.
 */
export function ownsApplication(
  session: SessionPayload,
  applicantUserId: string,
): boolean {
  if (session.role !== "EXTERNAL_APPLICANT") return true; // Ministry staff bypass ownership
  return session.userId === applicantUserId;
}
