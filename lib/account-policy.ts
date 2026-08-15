/**
 * Who may act on whose account.
 *
 * On 2026-08-14 one System Admin deactivated another and locked the Ministry
 * out of the platform entirely. The permission check passed — both were System
 * Admins — because nothing said "not the last one" and nothing said "not
 * yourself". These rules exist so that cannot happen again, and so the new
 * ADMIN role can run day-to-day staff administration without reaching the
 * accounts that would lock everyone out.
 *
 * Every rule here is enforced SERVER-SIDE in app/actions/admin.ts. Hiding a
 * button is not a permission.
 */

import type { UserRole } from "@prisma/client";

/** Accounts an ADMIN must never create, edit, deactivate or promote into. */
export const PROTECTED_ROLES: UserRole[] = [
  "SYSTEM_ADMIN",
  "ADMIN",
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
];

/** Roles that reach staff administration at all. */
export const STAFF_ADMIN_ROLES: UserRole[] = [
  "SYSTEM_ADMIN",
  "ADMIN",
  "PERMANENT_SECRETARY",
];

/** System-level controls: settings, fleet renumbering, sticker pre-loading. */
export const SYSTEM_CONTROL_ROLES: UserRole[] = ["SYSTEM_ADMIN"];

export type PolicyResult = { ok: true } | { ok: false; reason: string };

const OK: PolicyResult = { ok: true };
const no = (reason: string): PolicyResult => ({ ok: false, reason });

/**
 * May `actor` create, edit or change the active state of an account holding
 * `targetRole`?
 *
 * Applicants are out of scope — they are managed through their own flows.
 */
export function canManageAccount(
  actorRole: UserRole,
  targetRole: UserRole,
): PolicyResult {
  if (targetRole === "EXTERNAL_APPLICANT") {
    return no("Applicant accounts are not managed from staff administration.");
  }

  if (actorRole === "SYSTEM_ADMIN") return OK;

  // Only a System Admin may touch a System Admin. A Permanent Secretary could
  // previously do this, which is how a single account change took the platform
  // down.
  if (targetRole === "SYSTEM_ADMIN") {
    return no("Only a System Administrator can manage a System Administrator account.");
  }

  if (actorRole === "ADMIN") {
    if (PROTECTED_ROLES.includes(targetRole)) {
      return no(
        `An Administrator cannot manage ${label(targetRole)} accounts. Ask a System Administrator.`,
      );
    }
    return OK;
  }

  if (actorRole === "PERMANENT_SECRETARY") return OK;

  return no("You do not have permission to manage staff accounts.");
}

/** May `actor` assign `targetRole` when creating or editing an account? */
export function canAssignRole(
  actorRole: UserRole,
  targetRole: UserRole,
): PolicyResult {
  if (actorRole === "SYSTEM_ADMIN") return OK;

  // Without this an ADMIN could promote a junior account to SYSTEM_ADMIN and
  // then act through it — the restriction above would be decorative.
  if (actorRole === "ADMIN" && PROTECTED_ROLES.includes(targetRole)) {
    return no(
      `An Administrator cannot assign the ${label(targetRole)} role. Ask a System Administrator.`,
    );
  }

  if (actorRole === "PERMANENT_SECRETARY" && targetRole === "SYSTEM_ADMIN") {
    return no("Only a System Administrator can assign the System Administrator role.");
  }

  return OK;
}

/**
 * Guards that apply to deactivation specifically, on top of canManageAccount.
 * `remainingActiveSystemAdmins` counts active System Admins OTHER than the
 * target.
 */
export function canDeactivate(opts: {
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  targetRole: UserRole;
  remainingActiveSystemAdmins: number;
}): PolicyResult {
  const base = canManageAccount(opts.actorRole, opts.targetRole);
  if (!base.ok) return base;

  if (opts.actorId === opts.targetId) {
    return no("You cannot deactivate your own account.");
  }

  if (opts.targetRole === "SYSTEM_ADMIN" && opts.remainingActiveSystemAdmins < 1) {
    return no(
      "This is the last active System Administrator. Deactivating it would lock everyone out of the platform.",
    );
  }

  return OK;
}

/** "HOD_TRANSPORT_OPS" -> "Hod Transport Ops" */
function label(role: UserRole): string {
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
