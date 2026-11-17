/**
 * Who may do what with Special Enforcement Unit (ex Park Monitor)
 * applications. Kept in one place so pages, actions and navigation agree.
 */

/** Can approve / reject / waitlist an application, and add or replace its photo. */
export const ENFORCEMENT_APPROVER_ROLES = [
  "HOD_PARKS",
  "HOD_PARKS_REVALIDATION",
  "SYSTEM_ADMIN",
  "COMMISSIONER",
] as const;

/** Can form, edit and disband unit groups. */
export const ENFORCEMENT_GROUPER_ROLES = [
  "HOD_PARKS",
  "HOD_PARKS_REVALIDATION",
  "SYSTEM_ADMIN",
] as const;

/** Can see the applications, groups and cards (read-only for those not above). */
export const ENFORCEMENT_VIEWER_ROLES = [
  ...ENFORCEMENT_APPROVER_ROLES,
  "PERMANENT_SECRETARY",
  "ADMIN",
] as const;

export const isEnforcementApprover = (role: string | undefined) =>
  !!role && (ENFORCEMENT_APPROVER_ROLES as readonly string[]).includes(role);
export const isEnforcementGrouper = (role: string | undefined) =>
  !!role && (ENFORCEMENT_GROUPER_ROLES as readonly string[]).includes(role);
export const isEnforcementViewer = (role: string | undefined) =>
  !!role && (ENFORCEMENT_VIEWER_ROLES as readonly string[]).includes(role);
