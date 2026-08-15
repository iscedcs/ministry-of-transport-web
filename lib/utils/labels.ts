// ── Label & Option Maps — Ministry of Transport Platform ──────────────────────
// Centralised display labels, select options, and badge class helpers.

import { UserRole } from "@prisma/client";

/** Human-readable Ministry staff role labels. */
export const ROLE_LABELS: Record<UserRole, string> = {
  COMMISSIONER: "Commissioner",
  PERMANENT_SECRETARY: "Permanent Secretary",
  HOD_PARKS: "HOD — Parks",
  HOD_VIS: "HOD — VIS",
  HOD_TRANSPORT_OPS: "HOD — Transport Operations",
  HOD_PARKS_REVALIDATION: "HOD — Parks Revalidation",
  FIELD_INSPECTOR: "Field Inspector",
  FINANCE_OFFICER: "Finance Officer",
  VEHICLE_INSPECTION_OFFICER: "Vehicle Inspection Officer (VIO)",
  SYSTEM_ADMIN: "System Administrator",
  ADMIN: "Administrator (Ministry)",
  ICT_OFFICER: "ICT Officer — Ministry Printing Center",
  ICT_OFFICER_TRACAS: "ICT Officer — TRACAS Printing",
  ENUMERATOR: "Enumerator (Fleet & Driver Onboarding)",
  TRACAS_MD: "Ag. MD/CEO — TRACAS",
  PARK_MONITOR: "Park Monitor",
  EXTERNAL_APPLICANT: "External Applicant",
};

/** Dynamic select options generated from Prisma UserRole enum */
export const STAFF_ROLE_OPTIONS = (Object.keys(UserRole) as UserRole[])
  .filter((role) => role !== "EXTERNAL_APPLICANT")
  .map((role) => ({
    value: role,
    label: ROLE_LABELS[role] || role,
  }));

/** Application status options for filter selects. */
export const APPLICATION_STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  {
    value: "PENDING_PS_INSPECTION_APPROVAL",
    label: "Inspection — Awaiting PS",
  },
  { value: "INSPECTION_SCHEDULED", label: "Inspection Scheduled" },
  { value: "INSPECTION_IN_PROGRESS", label: "Inspection In Progress" },
  { value: "INSPECTION_COMPLETED", label: "Inspection Completed" },
  { value: "PENDING_HOD_APPROVAL", label: "Awaiting HOD" },
  { value: "PENDING_PS_APPROVAL", label: "Awaiting Permanent Secretary" },
  { value: "PENDING_COMMISSIONER_APPROVAL", label: "Awaiting Commissioner" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REVOKED", label: "Revoked" },
];

/** Fee type options used in FeeSchedule management. */
export const FEE_TYPES = [
  { value: "MOTOR_PARK_REGISTRATION", label: "Motor Park Registration" },
  { value: "MOTOR_PARK_RENEWAL", label: "Motor Park Renewal" },
  {
    value: "FLEET_OPERATOR_REGISTRATION",
    label: "Fleet Operator Registration",
  },
  { value: "FLEET_OPERATOR_RENEWAL", label: "Fleet Operator Renewal" },
  { value: "VEHICLE_INSPECTION", label: "Vehicle Inspection" },
  { value: "INSPECTION_CERTIFICATE", label: "Inspection Certificate" },
  { value: "OPERATING_PERMIT", label: "Operating Permit" },
  { value: "PENALTY_FEE", label: "Penalty / Fine" },
  { value: "LATE_RENEWAL_SURCHARGE", label: "Late Renewal Surcharge" },
];

/** Entity type labels for InspectionChecklistTemplate display. */
export const CHECKLIST_ENTITY_LABELS: Record<string, string> = {
  MotorPark: "Motor Park Inspection",
  MassTransitCompany: "Mass Transit Company Inspection",
  Vehicle: "Vehicle Inspection",
};

/**
 * Returns a Tailwind class string for audit log action badge colouring.
 */
export function getActionBadgeClass(action: string): string {
  const a = action.toUpperCase();
  if (a.includes("DEACTIVAT") || a.includes("REVOK") || a.includes("REJECT")) {
    return "bg-destructive/10 text-destructive";
  }
  if (a.includes("CREAT") || a.includes("APPROV") || a.includes("ISSU")) {
    return "bg-green-500/10 text-green-700 dark:text-green-400";
  }
  return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
}
