/**
 * Role-aware work queues for the dashboard home page.
 *
 * The old overview showed motor park counts to everybody, which meant an HOD
 * looking at 257 revalidation applications still saw four zeros and had to
 * remember to open the revalidation queue by hand.
 *
 * This module answers one question per role: *what is sitting on your desk
 * right now?* Each role only runs the queries that concern it, so the page
 * costs a handful of counts rather than a survey of the whole platform.
 */

import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";

export type Tone = "urgent" | "action" | "info";

export interface WorkItem {
  key: string;
  label: string;
  /** What the viewer is expected to do about it. */
  hint: string;
  count: number;
  href: string;
  tone: Tone;
}

export interface RoleDashboard {
  /** Queues where this user is the blocking party. */
  actions: WorkItem[];
  /** Context — useful to see, but not waiting on this user. */
  overview: WorkItem[];
}

/** Revalidation stages, and who clears each one. */
const REVALIDATION_STAGES = {
  HOD_INTAKE: ["SUBMITTED", "UNDER_REVIEW"],
  PS_INSPECTION: ["PENDING_PS_INSPECTION_APPROVAL"],
  INSPECTOR: ["INSPECTION_SCHEDULED", "INSPECTION_IN_PROGRESS"],
  HOD_APPROVAL: ["PENDING_HOD_APPROVAL", "INSPECTION_COMPLETED"],
  PS_APPROVAL: ["PENDING_PS_APPROVAL"],
  COMMISSIONER: ["PENDING_COMMISSIONER_APPROVAL"],
} as const;

const revalidations = (statuses: readonly string[]) =>
  db.revalidationApplication.count({
     
    where: { status: { in: statuses as any } },
  });

const motorParks = (statuses: readonly string[]) =>
  db.motorPark.count({
     
    where: { applicationStatus: { in: statuses as any } },
  });

 
const tracasLetters = (status: any) =>
  db.tracasVehicle.count({ where: { letterStatus: status } });

 
const tracasIdCards = (status: any) =>
  db.tracasDriver.count({ where: { idCardStatus: status } });

const item = (
  key: string,
  label: string,
  hint: string,
  count: number,
  href: string,
  tone: Tone = "action",
): WorkItem => ({ key, label, hint, count, href, tone });

export async function getRoleDashboard(
  role: UserRole,
  userId: string,
): Promise<RoleDashboard> {
  const actions: WorkItem[] = [];
  const overview: WorkItem[] = [];

  const isHodParks = role === "HOD_PARKS" || role === "HOD_PARKS_REVALIDATION";
  const isPs = role === "PERMANENT_SECRETARY";
  const isCommissioner = role === "COMMISSIONER";
  const isAdmin = role === "SYSTEM_ADMIN";
  const isInspector = role === "FIELD_INSPECTOR";
  const isVio = role === "VEHICLE_INSPECTION_OFFICER" || role === "HOD_VIS";

  // ── Parks: intake, inspection reports, monitors ──────────────────────────
  if (isHodParks || isAdmin) {
    const [intake, hodApproval, parkIntake, monitors, revalTotal] =
      await Promise.all([
        revalidations(REVALIDATION_STAGES.HOD_INTAKE),
        revalidations(REVALIDATION_STAGES.HOD_APPROVAL),
        motorParks(["SUBMITTED", "UNDER_REVIEW"]),
        db.parkMonitorApplication.count({
          where: {
            OR: [
              { status: { in: ["SUBMITTED", "UNDER_REVIEW", "WAITLISTED"] } },
              { status: "APPROVED", idCardIssued: false },
            ],
          },
        }),
        db.revalidationApplication.count(),
      ]);

    if (intake)
      actions.push(
        item(
          "reval-intake",
          "Revalidations awaiting review",
          "Review the application and schedule an inspection",
          intake,
          "/admin/revalidation-queue",
          intake > 50 ? "urgent" : "action",
        ),
      );
    if (hodApproval)
      actions.push(
        item(
          "reval-hod",
          "Inspection reports to sign off",
          "The inspector has reported — record your recommendation",
          hodApproval,
          "/admin/revalidation-queue",
        ),
      );
    if (parkIntake)
      actions.push(
        item(
          "park-intake",
          "Motor park applications",
          "New applications awaiting review",
          parkIntake,
          "/motor-parks",
        ),
      );
    if (monitors)
      actions.push(
        item(
          "monitors",
          "Park monitor applications",
          "Applications requiring your review",
          monitors,
          "/admin/park-monitors",
        ),
      );

    overview.push(
      item(
        "reval-total",
        "Revalidations on the register",
        "All applications, every stage",
        revalTotal,
        "/admin/revalidation-queue",
        "info",
      ),
    );
  }

  // ── Permanent Secretary: two distinct revalidation gates ────────────────
  if (isPs || isAdmin) {
    const [inspectionClearance, psApproval, parkApproval] = await Promise.all([
      revalidations(REVALIDATION_STAGES.PS_INSPECTION),
      revalidations(REVALIDATION_STAGES.PS_APPROVAL),
      motorParks(["PENDING_PS_APPROVAL"]),
    ]);

    if (inspectionClearance)
      actions.push(
        item(
          "ps-inspection",
          "Inspection schedules to clear",
          "Approve the date and officer before the inspection goes ahead",
          inspectionClearance,
          "/admin/revalidation-queue",
        ),
      );
    if (psApproval)
      actions.push(
        item(
          "ps-approval",
          "Revalidations awaiting your recommendation",
          "Sign off before it reaches the Commissioner",
          psApproval,
          "/admin/revalidation-queue",
        ),
      );
    if (parkApproval)
      actions.push(
        item(
          "ps-parks",
          "Motor parks awaiting your recommendation",
          "Review before final approval",
          parkApproval,
          "/motor-parks",
        ),
      );
  }

  // ── Commissioner: the final signature on four separate chains ───────────
  if (isCommissioner || isAdmin) {
    const [reval, letters, idCards, parks] = await Promise.all([
      revalidations(REVALIDATION_STAGES.COMMISSIONER),
      tracasLetters("PENDING_COMMISSIONER_APPROVAL"),
      tracasIdCards("PENDING_COMMISSIONER_APPROVAL"),
      motorParks(["PENDING_APPROVAL", "PENDING_COMMISSIONER_APPROVAL"]),
    ]);

    if (reval)
      actions.push(
        item(
          "com-reval",
          "Revalidation certificates to approve",
          "Your signature issues the certificate",
          reval,
          "/admin/revalidation-queue",
        ),
      );
    if (letters)
      actions.push(
        item(
          "com-letters",
          "Letters awaiting your signature",
          "Final signature before printing",
          letters,
          "/tracas-approvals",
        ),
      );
    if (idCards)
      actions.push(
        item(
          "com-ids",
          "Driver ID cards awaiting your signature",
          "Final signature before printing",
          idCards,
          "/id-card-approvals",
        ),
      );
    if (parks)
      actions.push(
        item(
          "com-parks",
          "Motor park permits to approve",
          "Awaiting your decision",
          parks,
          "/motor-parks",
        ),
      );
  }

  // ── Field inspector: only what is assigned to them ──────────────────────
  if (isInspector) {
    const [assigned, inspections] = await Promise.all([
      db.revalidationApplication.count({
        where: {
          inspectionOfficerId: userId,
          status: { in: ["INSPECTION_SCHEDULED", "INSPECTION_IN_PROGRESS"] },
        },
      }),
      db.inspection.count({
        where: { assignedToUserId: userId, completedAt: null },
      }),
    ]);

    if (assigned)
      actions.push(
        item(
          "insp-reval",
          "Park inspections assigned to you",
          "Complete the checklist and upload evidence",
          assigned,
          "/admin/revalidation-queue",
        ),
      );
    if (inspections)
      actions.push(
        item(
          "insp-open",
          "Open inspections",
          "Scheduled visits not yet reported",
          inspections,
          "/inspections",
        ),
      );
  }

  // ── VIO / HOD VIS: first gate on both TRACAS chains ─────────────────────
  if (isVio || isAdmin) {
    const [letters, idCards] = await Promise.all([
      tracasLetters("PENDING_VIO_APPROVAL"),
      tracasIdCards("PENDING_VIO_APPROVAL"),
    ]);

    if (letters)
      actions.push(
        item(
          "vio-letters",
          "Letters awaiting VIO verification",
          "Confirm the vehicle particulars",
          letters,
          "/tracas-approvals",
        ),
      );
    if (idCards)
      actions.push(
        item(
          "vio-ids",
          "Driver IDs awaiting VIO verification",
          "Confirm the driver's particulars",
          idCards,
          "/id-card-approvals",
        ),
      );
  }

  // ── Finance ─────────────────────────────────────────────────────────────
  if (role === "FINANCE_OFFICER" || isAdmin) {
    const pending = await db.payment.count({ where: { status: "PENDING" } });
    if (pending)
      actions.push(
        item(
          "fin-pending",
          "Payments awaiting reconciliation",
          "Match against the bank statement",
          pending,
          "/payments",
        ),
      );
  }

  // De-duplicate: a System Admin matches several branches at once.
  const seen = new Set<string>();
  return {
    actions: actions.filter((a) => !seen.has(a.key) && seen.add(a.key)),
    overview,
  };
}
