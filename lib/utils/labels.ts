// ── Label & Option Maps — Ministry of Transport Platform ──────────────────────
// Centralised display labels, select options, and badge class helpers.

/** Human-readable Ministry staff role labels. */
export const ROLE_LABELS: Record<string, string> = {
  COMMISSIONER: "Commissioner",
  PERMANENT_SECRETARY: "Permanent Secretary",
  HOD_PARKS: "HOD — Parks",
  HOD_VIS: "HOD — VIS",
  HOD_TRANSPORT_OPS: "HOD — T.Ops",
  HOD_PARKS_REVALIDATION: "HOD — PRS",
  FIELD_INSPECTOR: "Field Inspector",
  FINANCE_OFFICER: "Finance Officer",
  VEHICLE_INSPECTION_OFFICER: "VIO",
  SYSTEM_ADMIN: "System Admin",
  EXTERNAL_APPLICANT: "Applicant",
};

/** Application status options for filter selects. */
export const APPLICATION_STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "INSPECTION_SCHEDULED", label: "Inspection Scheduled" },
  { value: "INSPECTION_IN_PROGRESS", label: "Inspection In Progress" },
  { value: "INSPECTION_COMPLETED", label: "Inspection Completed" },
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
 *   - Red for destructive actions (deactivate, revoke, reject)
 *   - Green for positive actions (create, approve)
 *   - Blue for neutral mutations (update, assign)
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
