"use server";

/**
 * Motor park revalidation — approval chain.
 *
 *   Applicant submits          →  SUBMITTED                       (HOD Operations)
 *   HOD Ops schedules a visit  →  INSPECTION_SCHEDULED            (inspection team)
 *   Lead files the checklist   →  INSPECTION_COMPLETED            (team comments, then HOD Ops)
 *   HOD Ops recommends         →  PENDING_HOD_APPROVAL            (HOD Parks Revalidation)
 *   HOD Revalidation approves  →  PENDING_PS_APPROVAL
 *   PS approves                →  PENDING_COMMISSIONER_APPROVAL
 *   Commissioner approves      →  APPROVED  (temporal or permanent)
 *
 * THE INSPECTION IS A TEAM EXERCISE. Between two and four officers attend; the
 * HOD of Operations is always one of them and cannot be removed. Exactly one
 * member is the LEAD, designated at scheduling — the lead owns the checklist,
 * findings and evidence, and every other member contributes a comment. The HOD
 * reads the checklist and all comments before recording a recommendation.
 *
 * A PS REJECTION IS NOT A DEAD END. The PS must give a reason, and the
 * application returns to HOD Operations at SUBMITTED, from where the visit can
 * be rescheduled or the applicant asked to reapply.
 */

import { db } from "@/lib/db";
import { requireRole, requireAuth, authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/** Schedules the visit, leads the team, and gives the first recommendation. */
const HOD_OPS_ROLES = ["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"] as const;

/** Reviews everything HOD Operations sends up. */
const HOD_REVALIDATION_ROLES = ["HOD_PARKS_REVALIDATION", "SYSTEM_ADMIN"] as const;

const PS_ROLES = ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"] as const;
const COMMISSIONER_ROLES = ["COMMISSIONER", "SYSTEM_ADMIN"] as const;

/** Officers who may be put on an inspection team. */
const INSPECTOR_ROLES = [
  "FIELD_INSPECTOR",
  "VEHICLE_INSPECTION_OFFICER",
  "HOD_VIS",
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS",
  "HOD_PARKS_REVALIDATION",
  "PARK_MONITOR",
] as const;

const MIN_TEAM = 2;
const MAX_TEAM = 4;

/** Months a certificate runs for, by approval type. */
const VALIDITY_MONTHS = { TEMPORAL: 6, PERMANENT: 12 } as const;

export type ApprovalType = keyof typeof VALIDITY_MONTHS;

function touch(applicationId: string) {
  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue`);
  revalidatePath(`/revalidation`);
}

// ── Team selection ──────────────────────────────────────────────────────────

/** Officers the HOD may pick from when composing an inspection team. */
export async function getEligibleInspectors() {
  const authz = await authorize([...HOD_OPS_ROLES]);
  if (!authz.ok) return { success: false as const, error: authz.error, data: [] };

  const users = await db.user.findMany({
    where: { isActive: true, role: { in: [...INSPECTOR_ROLES] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      stationLocation: true,
    },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
  });

  return { success: true as const, data: users };
}

// ── Stage 1: HOD Operations schedules the inspection ────────────────────────

export async function scheduleRevalidationInspection(
  applicationId: string,
  memberIds: string[],
  leadId: string,
  inspectionDateStr: string,
) {
  const authz = await authorize([...HOD_OPS_ROLES]);
  if (!authz.ok) {
    return {
      success: false,
      error: "Only the HOD of Operations can schedule an inspection.",
    };
  }

  const app = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, parkName: true },
  });
  if (!app) return { success: false, error: "Application not found." };

  if (!["SUBMITTED", "UNDER_REVIEW"].includes(app.status)) {
    return {
      success: false,
      error: `This application is not awaiting scheduling (currently ${app.status}).`,
    };
  }

  const date = new Date(inspectionDateStr);
  if (isNaN(date.getTime())) {
    return { success: false, error: "Enter a valid inspection date." };
  }

  // The HOD always attends, whether or not they ticked their own name.
  const team = Array.from(new Set([...memberIds, authz.session.userId])).filter(
    Boolean,
  );

  if (team.length < MIN_TEAM) {
    return {
      success: false,
      error: `An inspection needs at least ${MIN_TEAM} officers — select at least one besides yourself.`,
    };
  }
  if (team.length > MAX_TEAM) {
    return {
      success: false,
      error: `An inspection team may hold at most ${MAX_TEAM} officers (you are counted automatically).`,
    };
  }
  if (!team.includes(leadId)) {
    return {
      success: false,
      error: "The lead inspector must be one of the selected officers.",
    };
  }

  const found = await db.user.count({
    where: { id: { in: team }, isActive: true },
  });
  if (found !== team.length) {
    return { success: false, error: "One or more selected officers are invalid." };
  }

  await db.$transaction([
    // Replace any previous team — rescheduling starts the visit afresh.
    db.revalidationInspector.deleteMany({ where: { applicationId } }),
    db.revalidationInspector.createMany({
      data: team.map((userId) => ({
        applicationId,
        userId,
        isLead: userId === leadId,
      })),
    }),
    db.revalidationApplication.update({
      where: { id: applicationId },
      data: {
        // Kept in step so existing "my inspections" views keep working.
        inspectionOfficerId: leadId,
        inspectionDate: date,
        status: "INSPECTION_SCHEDULED",
        // Clear anything left over from an earlier attempt.
        findings: null,
        recommendation: null,
        inspectionChecklist: undefined,
        evidenceUrls: undefined,
        inspectionCompletedAt: null,
        hodOpsRecommendation: null,
        hodOpsApprovedAt: null,
        hodOpsApprovedByUserId: null,
        psRejectionReason: null,
      },
    }),
  ]);

  await recordAudit({
    action: "REVALIDATION_INSPECTION_SCHEDULED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `Inspection scheduled for ${app.parkName} on ${date.toDateString()} — ${team.length} officers, lead assigned`,
    oldValues: { status: app.status },
    newValues: { status: "INSPECTION_SCHEDULED", team: team.length, leadId },
  });

  touch(applicationId);
  revalidatePath("/inspections");
  return { success: true };
}

// ── Stage 2a: the LEAD files the checklist, findings and evidence ───────────

export async function submitRevalidationFindings(
  applicationId: string,
  findings: string,
  recommendation: string,
  evidenceUrls: { url: string; caption?: string }[] = [],
  checklist: unknown[] = [],
) {
  const session = await requireAuth();

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: {
      status: true,
      parkName: true,
      inspectionTeam: { select: { userId: true, isLead: true } },
    },
  });
  if (!current) return { success: false, error: "Application not found." };

  if (current.status !== "INSPECTION_SCHEDULED") {
    return {
      success: false,
      error: `This application is not out for inspection (currently ${current.status}).`,
    };
  }

  // Only the designated lead owns the checklist. Other team members comment.
  const isLead = current.inspectionTeam.some(
    (m) => m.userId === session.userId && m.isLead,
  );
  const isOverride = session.role === "SYSTEM_ADMIN";
  if (!isLead && !isOverride) {
    const onTeam = current.inspectionTeam.some((m) => m.userId === session.userId);
    return {
      success: false,
      error: onTeam
        ? "Only the lead inspector fills the checklist — please leave a comment instead."
        : "You are not on this inspection team.",
    };
  }

  if (!findings?.trim()) {
    return { success: false, error: "Findings are required." };
  }
  if (evidenceUrls.length === 0) {
    return {
      success: false,
      error: "At least one piece of evidence must be uploaded.",
    };
  }

  const unanswered = checklist.filter(
    (i) =>
      !i || typeof i !== "object" || (i as { verified?: unknown }).verified == null,
  ).length;
  if (checklist.length > 0 && unanswered > 0) {
    return {
      success: false,
      error: `${unanswered} checklist item(s) are unanswered.`,
    };
  }

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      findings: findings.trim(),
      recommendation,
      evidenceUrls: evidenceUrls as never,
      ...(checklist.length > 0 ? { inspectionChecklist: checklist as never } : {}),
      inspectionCompletedAt: new Date(),
      // The remaining team members may still be adding comments, so this waits
      // with HOD Operations rather than jumping straight up the chain.
      status: "INSPECTION_COMPLETED",
    },
  });

  await recordAudit({
    action: "REVALIDATION_INSPECTION_COMPLETED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `Lead inspector filed the report for ${app.parkName} — ${checklist.length} checklist item(s), ${evidenceUrls.length} evidence item(s)`,
    newValues: { status: "INSPECTION_COMPLETED", recommendation },
  });

  touch(applicationId);
  return { success: true, data: app };
}

// ── Stage 2b: every other team member leaves a comment ──────────────────────

export async function submitInspectionComment(
  applicationId: string,
  comment: string,
) {
  const session = await requireAuth();

  if (!comment?.trim()) {
    return { success: false, error: "A comment is required." };
  }

  const membership = await db.revalidationInspector.findUnique({
    where: { applicationId_userId: { applicationId, userId: session.userId } },
    select: { id: true },
  });
  if (!membership) {
    return { success: false, error: "You are not on this inspection team." };
  }

  const app = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, parkName: true },
  });
  if (!app) return { success: false, error: "Application not found." };

  if (!["INSPECTION_SCHEDULED", "INSPECTION_COMPLETED"].includes(app.status)) {
    return {
      success: false,
      error: "Comments can only be added while the inspection is open.",
    };
  }

  await db.revalidationInspector.update({
    where: { id: membership.id },
    data: { comment: comment.trim(), commentedAt: new Date() },
  });

  await recordAudit({
    action: "REVALIDATION_INSPECTION_COMMENT",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `Inspection comment recorded for ${app.parkName}`,
  });

  touch(applicationId);
  return { success: true };
}

// ── Stage 3: HOD Operations recommends and forwards ─────────────────────────

export async function hodOpsApproveRevalidation(
  applicationId: string,
  recommendation: string,
) {
  const authz = await authorize([...HOD_OPS_ROLES]);
  if (!authz.ok) {
    return {
      success: false,
      error: "Only the HOD of Operations can action this stage.",
    };
  }

  if (!recommendation?.trim()) {
    return { success: false, error: "A recommendation is required." };
  }

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, parkName: true },
  });
  if (!current) return { success: false, error: "Application not found." };

  if (current.status !== "INSPECTION_COMPLETED") {
    return {
      success: false,
      error: `The inspection report is not ready for your recommendation (currently ${current.status}).`,
    };
  }

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      hodOpsRecommendation: recommendation.trim(),
      hodOpsApprovedAt: new Date(),
      hodOpsApprovedByUserId: authz.session.userId,
      status: "PENDING_HOD_APPROVAL",
    },
  });

  await recordAudit({
    action: "REVALIDATION_HOD_OPS_APPROVED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `HOD Operations recommended ${app.parkName}; forwarded to HOD Parks Revalidation`,
    oldValues: { status: current.status },
    newValues: { status: "PENDING_HOD_APPROVAL" },
  });

  touch(applicationId);
  return { success: true, data: app };
}

// ── Stage 4: HOD Parks Revalidation reviews ─────────────────────────────────

export async function hodApproveRevalidation(applicationId: string) {
  const authz = await authorize([...HOD_REVALIDATION_ROLES]);
  if (!authz.ok) {
    return {
      success: false,
      error: "Only the HOD of Parks Revalidation can action this stage.",
    };
  }

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, parkName: true },
  });
  if (!current) return { success: false, error: "Application not found." };

  if (current.status !== "PENDING_HOD_APPROVAL") {
    return {
      success: false,
      error: `This application is not awaiting your review (currently ${current.status}).`,
    };
  }

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: { hodApprovedAt: new Date(), status: "PENDING_PS_APPROVAL" },
  });

  await recordAudit({
    action: "REVALIDATION_HOD_APPROVED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `HOD Parks Revalidation approved ${app.parkName}; forwarded to the PS`,
    newValues: { status: "PENDING_PS_APPROVAL" },
  });

  touch(applicationId);
  return { success: true, data: app };
}

// ── Stage 5: Permanent Secretary ────────────────────────────────────────────

export async function psApproveRevalidation(applicationId: string) {
  const authz = await authorize([...PS_ROLES]);
  if (!authz.ok) {
    return { success: false, error: "Only the Permanent Secretary can action this stage." };
  }

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, parkName: true },
  });
  if (!current) return { success: false, error: "Application not found." };

  if (current.status !== "PENDING_PS_APPROVAL") {
    return {
      success: false,
      error: `This application is not awaiting your approval (currently ${current.status}).`,
    };
  }

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: { psApprovedAt: new Date(), status: "PENDING_COMMISSIONER_APPROVAL" },
  });

  await recordAudit({
    action: "REVALIDATION_PS_APPROVED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `PS approved revalidation for ${app.parkName}; forwarded to the Commissioner`,
    newValues: { status: "PENDING_COMMISSIONER_APPROVAL" },
  });

  touch(applicationId);
  return { success: true, data: app };
}

/**
 * The PS sends the application back to HOD Operations with a reason. From
 * SUBMITTED the HOD can reschedule the inspection, or the applicant can be
 * asked to reapply.
 */
export async function psRejectRevalidation(
  applicationId: string,
  reason: string,
) {
  const authz = await authorize([...PS_ROLES]);
  if (!authz.ok) {
    return { success: false, error: "Only the Permanent Secretary can action this stage." };
  }

  if (!reason?.trim()) {
    return { success: false, error: "A reason is required when sending this back." };
  }

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, parkName: true },
  });
  if (!current) return { success: false, error: "Application not found." };

  if (current.status !== "PENDING_PS_APPROVAL") {
    return {
      success: false,
      error: `This application is not at your stage (currently ${current.status}).`,
    };
  }

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      psRejectionReason: reason.trim(),
      // Back to HOD Operations' intake queue.
      status: "SUBMITTED",
      hodOpsApprovedAt: null,
      hodOpsApprovedByUserId: null,
      hodApprovedAt: null,
      psApprovedAt: null,
    },
  });

  await recordAudit({
    action: "REVALIDATION_PS_REJECTED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `PS returned ${app.parkName} to HOD Operations: ${reason.trim()}`,
    oldValues: { status: "PENDING_PS_APPROVAL" },
    newValues: { status: "SUBMITTED" },
  });

  touch(applicationId);
  return { success: true, data: app };
}

// ── Stage 6: Commissioner — temporal or permanent ───────────────────────────

export async function commissionerApproveRevalidation(
  applicationId: string,
  approvalType: ApprovalType = "PERMANENT",
) {
  const authz = await authorize([...COMMISSIONER_ROLES]);
  if (!authz.ok) {
    return { success: false, error: "Only the Commissioner can grant final approval." };
  }

  if (approvalType !== "TEMPORAL" && approvalType !== "PERMANENT") {
    return { success: false, error: "Choose either a temporal or a permanent approval." };
  }

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true },
  });
  if (!current) return { success: false, error: "Application not found." };

  if (current.status !== "PENDING_COMMISSIONER_APPROVAL") {
    return {
      success: false,
      error: `This application is not awaiting your approval (currently ${current.status}).`,
    };
  }

  const currentYear = new Date().getFullYear();
  const count = await db.revalidationApplication.count({
    where: { status: "APPROVED", approvedAt: { gte: new Date(currentYear, 0, 1) } },
  });
  const seq = String(count + 1).padStart(4, "0");
  // A temporal permit is numbered distinctly so it is never mistaken for a
  // full revalidation on paper.
  const prefix = approvalType === "TEMPORAL" ? "AN-TMP" : "AN-REV";
  const revalidationNumber = `${prefix}-${currentYear}-${seq}`;

  const validUntil = new Date();
  validUntil.setMonth(validUntil.getMonth() + VALIDITY_MONTHS[approvalType]);

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      commissionerApprovedAt: new Date(),
      approvedAt: new Date(),
      approvalType,
      revalidationNumber,
      validUntil,
      status: "APPROVED",
    },
  });

  // ── Sync the motor park register ──────────────────────────────────────────
  let existingPark = null;

  if (app.motorParkId) {
    existingPark = await db.motorPark.findUnique({ where: { id: app.motorParkId } });
  }

  if (!existingPark && app.asinNumber) {
    existingPark = await db.motorPark.findFirst({
      where: {
        OR: [
          { anssidNumber: { equals: app.asinNumber, mode: "insensitive" as const } },
          ...(app.existingApprovalNum
            ? [{ permitNumber: { equals: app.existingApprovalNum, mode: "insensitive" as const } }]
            : []),
          ...(app.applicantUserId ? [{ contactUserId: app.applicantUserId }] : []),
        ],
      },
    });
  }

  // A temporal approval is a permission to keep operating while something is
  // put right — it must not present as a full permit on the register.
  const parkStatus = approvalType === "TEMPORAL" ? "TEMPORAL_APPROVAL" : "APPROVED";

  if (existingPark) {
    await db.motorPark.update({
      where: { id: existingPark.id },
      data: {
        businessName: app.parkName || existingPark.businessName,
        transportCompanyName: app.ownerName || existingPark.transportCompanyName,
        streetAddress: app.physicalLocation || existingPark.streetAddress,
        lga: app.lga || existingPark.lga,
        townCity: app.townCommunity || existingPark.townCity,
        contactPerson: app.representativeName || existingPark.contactPerson,
        contactPhone: app.phoneNumber || existingPark.contactPhone,
        contactEmail: app.emailAddress || existingPark.contactEmail,
        managerResidentialAddress:
          app.residentialAddress || existingPark.managerResidentialAddress,
        cacRegistrationNumber:
          app.cacRegistrationNumber || existingPark.cacRegistrationNumber,
        lastRevalidatedAt: new Date(),
        nextRevalidationDue: validUntil,
        applicationStatus: parkStatus,
        permitStatus: "ACTIVE",
        permitExpiresAt: validUntil,
        permitNumber: existingPark.permitNumber || revalidationNumber,
        permitIssuedAt: existingPark.permitIssuedAt || new Date(),
      },
    });
  } else if (app.applicantUserId) {
    await db.motorPark.create({
      data: {
        businessName: app.parkName,
        transportCompanyName: app.ownerName,
        streetAddress: app.physicalLocation ?? "",
        lga: app.lga ?? "",
        townCity: app.townCommunity ?? "",
        anssidNumber: app.asinNumber,
        cacRegistrationNumber: app.cacRegistrationNumber,
        contactUserId: app.applicantUserId,
        contactPerson: app.representativeName ?? app.ownerName,
        contactPhone: app.phoneNumber ?? "",
        contactEmail: app.emailAddress ?? "",
        managerResidentialAddress: app.residentialAddress,
        applicationStatus: parkStatus,
        permitStatus: "ACTIVE",
        permitExpiresAt: validUntil,
        permitNumber: revalidationNumber,
        permitIssuedAt: new Date(),
        lastRevalidatedAt: new Date(),
        nextRevalidationDue: validUntil,
        approvedAt: new Date(),
      },
    });
  }

  await recordAudit({
    action: "REVALIDATION_COMMISSIONER_APPROVED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `Commissioner granted ${approvalType.toLowerCase()} approval for ${app.parkName}; certificate ${revalidationNumber} issued, valid to ${validUntil.toDateString()}`,
    newValues: { status: "APPROVED", approvalType, revalidationNumber },
  });

  touch(applicationId);
  revalidatePath(`/motor-parks`);
  revalidatePath(`/ict-printing`);
  return { success: true, data: app };
}

// ── Outright rejection ──────────────────────────────────────────────────────

export async function rejectRevalidation(applicationId: string, reason?: string) {
  const authz = await authorize([
    "HOD_PARKS_REVALIDATION",
    "HOD_TRANSPORT_OPS",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      ...(reason?.trim() ? { rejectionReason: reason.trim() } : {}),
    },
  });

  await recordAudit({
    action: "REVALIDATION_REJECTED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `Revalidation rejected for ${app.parkName}${reason?.trim() ? `: ${reason.trim()}` : ""}`,
    newValues: { status: "REJECTED" },
  });

  touch(applicationId);
  return { success: true, data: app };
}

// ── Certificate terms ───────────────────────────────────────────────────────

/**
 * Set the values printed on the revalidation letter that the Ministry decides
 * rather than the applicant: the monthly operational fee, whether it was
 * reviewed, when the revalidation takes effect, and any facilities the park
 * must provide within six months.
 *
 * Amounts are entered in NAIRA and stored in kobo, matching the rest of the
 * platform.
 */
export async function setRevalidationCertificateTerms(
  applicationId: string,
  input: {
    monthlyFeeNaira?: string | number | null;
    previousMonthlyFeeNaira?: string | number | null;
    effectiveFrom?: string | null;
    requiredFacilities?: string | null;
  },
) {
  const authz = await authorize([
    "HOD_PARKS_REVALIDATION",
    "HOD_PARKS",
    "PERMANENT_SECRETARY",
    "COMMISSIONER",
    "SYSTEM_ADMIN",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  const toKobo = (v: string | number | null | undefined) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    if (!isFinite(n) || n < 0) return undefined; // signals invalid
    return Math.round(n * 100);
  };

  const fee = toKobo(input.monthlyFeeNaira);
  const prevFee = toKobo(input.previousMonthlyFeeNaira);
  if (fee === undefined || prevFee === undefined) {
    return { success: false, error: "Enter a valid fee amount." };
  }

  let effective: Date | null = null;
  if (input.effectiveFrom) {
    effective = new Date(input.effectiveFrom);
    if (isNaN(effective.getTime())) {
      return { success: false, error: "Enter a valid effective date." };
    }
  }

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      monthlyFeeAmount: fee,
      previousMonthlyFeeAmount: prevFee,
      effectiveFrom: effective,
      requiredFacilities: input.requiredFacilities?.trim() || null,
    },
  });

  await recordAudit({
    action: "REVALIDATION_TERMS_SET",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `Certificate terms set for ${app.parkName}${
      fee != null ? ` — monthly fee ₦${(fee / 100).toLocaleString()}` : ""
    }`,
    newValues: {
      monthlyFeeAmount: fee,
      previousMonthlyFeeAmount: prevFee,
      effectiveFrom: effective?.toISOString() ?? null,
    },
  });

  touch(applicationId);
  return { success: true, data: app };
}

/**
 * Suggested defaults for the terms form: the fee currently assessed on the
 * linked motor park, so the Ministry confirms a figure rather than typing one
 * from memory.
 */
export async function getRevalidationTermsDefaults(applicationId: string) {
  const authz = await authorize([
    "HOD_PARKS_REVALIDATION",
    "HOD_PARKS",
    "PERMANENT_SECRETARY",
    "COMMISSIONER",
    "SYSTEM_ADMIN",
  ]);
  if (!authz.ok) return { success: false as const, error: authz.error };

  const app = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { motorParkId: true, asinNumber: true, applicantUserId: true },
  });
  if (!app) return { success: false as const, error: "Application not found." };

  const park = app.motorParkId
    ? await db.motorPark.findUnique({
        where: { id: app.motorParkId },
        select: { monthlyLevyAmount: true },
      })
    : await db.motorPark.findFirst({
        where: {
          OR: [
            { anssidNumber: app.asinNumber },
            ...(app.applicantUserId ? [{ contactUserId: app.applicantUserId }] : []),
          ],
        },
        select: { monthlyLevyAmount: true },
      });

  return {
    success: true as const,
    data: { currentMonthlyLevyKobo: park?.monthlyLevyAmount ?? null },
  };
}
