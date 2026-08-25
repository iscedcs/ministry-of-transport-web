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

const fleetOperators = (statuses: readonly string[]) =>
  db.massTransitCompany.count({
    where: { applicationStatus: { in: statuses as never } },
  });

/** Inspection schedules the PS has not yet cleared, across every module. */
const pendingInspectionSchedules = () =>
  db.inspection.count({ where: { status: "PENDING_PS_APPROVAL" } });

const item = (
  key: string,
  label: string,
  hint: string,
  count: number,
  href: string,
  tone: Tone = "action",
): WorkItem => ({ key, label, hint, count, href, tone });

/**
 * Terminals added to an operator that is already approved.
 *
 * These run their own chain and belong to no application queue, so without a
 * count here a new terminal reaches the HOD's desk with nothing to announce
 * it — the operator submits, and the Ministry finds out by chance.
 */
async function addedTerminals(statuses: string[]): Promise<number> {
  return db.terminal.count({
    where: {
      motorParkId: null,
      // Only terminals added AFTER approval; those declared on a first
      // application move with the company and are counted with it.
      addedAt: { not: null },
      applicationStatus: { in: statuses as never },
    },
  });
}

export async function getRoleDashboard(
  role: UserRole,
  userId: string,
): Promise<RoleDashboard> {
  const actions: WorkItem[] = [];
  const overview: WorkItem[] = [];

  /** Schedules the visit, leads the team, gives the first recommendation. */
  const isHodOps = role === "HOD_TRANSPORT_OPS";
  /** The second review, after HOD Operations. */
  const isHodReval = role === "HOD_PARKS_REVALIDATION";
  /** Motor parks and monitors only — no longer part of revalidation. */
  const isHodParks = role === "HOD_PARKS";
  const isPs = role === "PERMANENT_SECRETARY";
  const isCommissioner = role === "COMMISSIONER";
  const isAdmin = role === "SYSTEM_ADMIN";
  /** Ministry Administrator — oversight of every queue, approves nothing. */
  const isMinistryAdmin = role === "ADMIN";
  const isInspector =
    role === "FIELD_INSPECTOR" ||
    role === "VEHICLE_INSPECTION_OFFICER" ||
    role === "PARK_MONITOR";
  const isVio = role === "VEHICLE_INSPECTION_OFFICER" || role === "HOD_VIS";

  // ── HOD Operations: schedule visits, then recommend ──────────────────────
  if (isHodOps || isAdmin) {
    const [intake, awaitingRecommendation, returned] = await Promise.all([
      revalidations(REVALIDATION_STAGES.HOD_INTAKE),
      revalidations(["INSPECTION_COMPLETED"]),
      db.revalidationApplication.count({
        where: { status: "SUBMITTED", psRejectionReason: { not: null } },
      }),
    ]);

    if (intake)
      actions.push(
        item(
          "ops-intake",
          "Revalidations awaiting inspection",
          "Pick an inspection team and set a date",
          intake,
          "/admin/revalidation-queue?status=SUBMITTED",
          intake > 50 ? "urgent" : "action",
        ),
      );
    if (awaitingRecommendation)
      actions.push(
        item(
          "ops-recommend",
          "Inspection reports awaiting your recommendation",
          "The team has reported — record your recommendation",
          awaitingRecommendation,
          "/admin/revalidation-queue?status=APPROVALS",
        ),
      );
    // Mass transit sits with the same HOD: schedule the terminal inspection,
    // then recommend once the report and branding are in.
    const [mtIntake, mtRecommend] = await Promise.all([
      fleetOperators(["SUBMITTED", "UNDER_REVIEW"]),
      // submitTerminalInspectionReport sets PENDING_HOD_APPROVAL; querying
      // PENDING_APPROVAL meant a filed report never reached this dashboard.
      fleetOperators(["PENDING_HOD_APPROVAL", "INSPECTION_COMPLETED"]),
    ]);

    if (mtIntake)
      actions.push(
        item(
          "mt-intake",
          "Mass transit applications to schedule",
          "Schedule the terminal inspection",
          mtIntake,
          "/fleet-operators?status=SUBMITTED",
        ),
      );
    if (mtRecommend)
      actions.push(
        item(
          "mt-recommend",
          "Mass transit awaiting your recommendation",
          "Inspection and branding are in — forward to the PS",
          mtRecommend,
          "/fleet-operators?status=PENDING_HOD_APPROVAL",
        ),
      );

    const [termSchedule, termRecommend] = await Promise.all([
      addedTerminals(["SUBMITTED", "UNDER_REVIEW", "REJECTED"]),
      addedTerminals(["INSPECTION_COMPLETED"]),
    ]);

    if (termSchedule)
      actions.push(
        item(
          "term-schedule",
          "New terminals to inspect",
          "Added to an approved operator - schedule the site visit",
          termSchedule,
          "/fleet-operators?status=APPROVED",
        ),
      );
    if (termRecommend)
      actions.push(
        item(
          "term-recommend",
          "Terminal inspections awaiting your recommendation",
          "The site has been inspected - forward to the PS",
          termRecommend,
          "/fleet-operators?status=APPROVED",
        ),
      );

    if (returned)
      actions.push(
        item(
          "ops-returned",
          "Returned by the Permanent Secretary",
          "Reschedule the inspection, or reject so the applicant can reapply",
          returned,
          "/admin/revalidation-queue?status=SUBMITTED",
          "urgent",
        ),
      );
  }

  // ── HOD Parks Revalidation: the second review ────────────────────────────
  if (isHodReval || isAdmin) {
    const [review, revalTotal] = await Promise.all([
      revalidations(["PENDING_HOD_APPROVAL"]),
      db.revalidationApplication.count(),
    ]);

    if (review)
      actions.push(
        item(
          "reval-review",
          "Revalidations awaiting your review",
          "Review the checklist, comments and HOD Operations' recommendation",
          review,
          "/admin/revalidation-queue?status=APPROVALS",
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

  // ── HOD Parks: motor parks and monitors ──────────────────────────────────
  if (isHodParks || isAdmin) {
    const [parkIntake, monitors] =
      await Promise.all([
        motorParks(["SUBMITTED", "UNDER_REVIEW"]),
        db.parkMonitorApplication.count({
          where: {
            OR: [
              { status: { in: ["SUBMITTED", "UNDER_REVIEW", "WAITLISTED"] } },
              { status: "APPROVED", idCardIssued: false },
            ],
          },
        }),
      ]);

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
  }

  // ── Permanent Secretary: two distinct revalidation gates ────────────────
  if (isPs || isAdmin) {
    const [psApproval, parkApproval, mtPs, schedules, termPs] =
      await Promise.all([
        revalidations(REVALIDATION_STAGES.PS_APPROVAL),
        motorParks(["PENDING_PS_APPROVAL"]),
        fleetOperators(["PENDING_PS_APPROVAL"]),
        pendingInspectionSchedules(),
        addedTerminals(["PENDING_PS_APPROVAL"]),
      ]);

    if (termPs)
      actions.push(
        item(
          "ps-terminal",
          "New terminals awaiting your approval",
          "Inspected and recommended - approve, or return with a reason",
          termPs,
          "/fleet-operators?status=APPROVED",
        ),
      );

    if (psApproval)
      actions.push(
        item(
          "ps-approval",
          "Revalidations awaiting your approval",
          "Approve, or return to HOD Operations with a reason",
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
    if (mtPs)
      actions.push(
        item(
          "ps-masstransit",
          "Mass transit operators awaiting your approval",
          "Approve to forward to the Commissioner",
          mtPs,
          "/fleet-operators?status=PENDING_PS_APPROVAL",
        ),
      );
    // These only appeared on /inspections, so they were easy to miss entirely.
    if (schedules)
      actions.push(
        item(
          "ps-schedules",
          "Inspection schedules to clear",
          "Approve the date and officer before the inspection goes ahead",
          schedules,
          "/inspections?status=PENDING_PS_APPROVAL",
        ),
      );
  }

  // ── Commissioner: the final signature on four separate chains ───────────
  if (isCommissioner || isAdmin) {
    const [reval, letters, idCards, parks, mtCom, termCom] = await Promise.all([
      revalidations(REVALIDATION_STAGES.COMMISSIONER),
      tracasLetters("PENDING_COMMISSIONER_APPROVAL"),
      tracasIdCards("PENDING_COMMISSIONER_APPROVAL"),
      motorParks(["PENDING_APPROVAL", "PENDING_COMMISSIONER_APPROVAL"]),
      fleetOperators(["PENDING_COMMISSIONER_APPROVAL"]),
      addedTerminals(["PENDING_COMMISSIONER_APPROVAL"]),
    ]);

    if (termCom)
      actions.push(
        item(
          "com-terminal",
          "New terminals to approve",
          "Your approval turns the terminal into a park with its own letter",
          termCom,
          "/fleet-operators?status=APPROVED",
        ),
      );

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
    if (mtCom)
      actions.push(
        item(
          "com-masstransit",
          "Mass transit permits to issue",
          "Final approval and permit to operate",
          mtCom,
          "/fleet-operators?status=PENDING_COMMISSIONER_APPROVAL",
        ),
      );
  }

  // ── Field inspector: only what is assigned to them ──────────────────────
  if (isInspector) {
    const [assigned, inspections] = await Promise.all([
      db.revalidationApplication.count({
        where: {
          inspectionTeam: { some: { userId } },
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
          "Park inspections you are on",
          "Fill the checklist if you are lead, otherwise leave a comment",
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

  // ── Ministry Administrator: oversight, not action ───────────────────────
  if (isMinistryAdmin) {
    const [revalIntake, revalApprovals, letters, idCards, monitors, staff] =
      await Promise.all([
        revalidations(REVALIDATION_STAGES.HOD_INTAKE),
        revalidations([
          "INSPECTION_COMPLETED",
          "PENDING_HOD_APPROVAL",
          "PENDING_PS_APPROVAL",
          "PENDING_COMMISSIONER_APPROVAL",
        ]),
        tracasLetters("PENDING_VIO_APPROVAL"),
        tracasIdCards("PENDING_VIO_APPROVAL"),
        db.parkMonitorApplication.count({
          where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "WAITLISTED"] } },
        }),
        db.user.count({ where: { role: { not: "EXTERNAL_APPLICANT" }, isActive: true } }),
      ]);

    const mtOpen = await fleetOperators([
      "SUBMITTED",
      "UNDER_REVIEW",
      "INSPECTION_SCHEDULED",
      "INSPECTION_COMPLETED",
      "PENDING_APPROVAL",
      "PENDING_PS_APPROVAL",
      "PENDING_COMMISSIONER_APPROVAL",
    ]);

    if (monitors)
      actions.push(
        item(
          "adm-monitors",
          "Park monitor applications",
          "Applications requiring review",
          monitors,
          "/admin/park-monitors",
        ),
      );

    overview.push(
      item(
        "adm-reval-intake",
        "Revalidations awaiting inspection",
        "With the HOD of Operations",
        revalIntake,
        "/admin/revalidation-queue?status=SUBMITTED",
        "info",
      ),
      item(
        "adm-reval-approvals",
        "Revalidations in approval",
        "Moving through HOD, PS and Commissioner",
        revalApprovals,
        "/admin/revalidation-queue?status=APPROVALS",
        "info",
      ),
      item(
        "adm-tracas",
        "TRACAS items at the first gate",
        "Letters and ID cards awaiting VIO verification",
        letters + idCards,
        "/tracas-approvals",
        "info",
      ),
      item(
        "adm-masstransit",
        "Mass transit applications in progress",
        "Anywhere between submission and permit",
        mtOpen,
        "/fleet-operators",
        "info",
      ),
      item(
        "adm-staff",
        "Active staff accounts",
        "Ministry staff you administer",
        staff,
        "/admin/users",
        "info",
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
