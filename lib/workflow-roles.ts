/**
 * Who does what in an application workflow — one definition, every module.
 *
 * The Ministry's rule: the HOD of OPERATIONS schedules inspections, for motor
 * parks, mass transit and revalidation alike. The HOD of Parks Revalidation
 * reviews and may reject, but does not schedule.
 *
 * Before this, only revalidation enforced anything. scheduleParkInspection and
 * scheduleTerminalInspection called requireAuth() alone — any signed-in user,
 * including an external applicant, could schedule an inspection against any
 * record. The UI additionally offered the button to four different HOD roles.
 */

import type { UserRole } from "@prisma/client";

/** Schedules inspections and composes the inspection team. */
export const SCHEDULE_ROLES: UserRole[] = ["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"];

/**
 * May reject an application outright. Both HODs can, plus the offices above
 * them — a rejection is a decision, not a scheduling act.
 */
export const REJECT_ROLES: UserRole[] = [
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS_REVALIDATION",
  "PERMANENT_SECRETARY",
  "COMMISSIONER",
  "SYSTEM_ADMIN",
];

export const canSchedule = (role: string | null | undefined): boolean =>
  !!role && (SCHEDULE_ROLES as string[]).includes(role);

export const canReject = (role: string | null | undefined): boolean =>
  !!role && (REJECT_ROLES as string[]).includes(role);
