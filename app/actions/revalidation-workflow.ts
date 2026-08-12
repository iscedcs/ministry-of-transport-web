"use server";

/**
 * Motor park revalidation — approval chain.
 *
 *   Applicant submits        →  SUBMITTED                        (with HOD)
 *   HOD schedules inspection →  PENDING_PS_INSPECTION_APPROVAL   (schedule with PS)
 *   PS clears the schedule   →  INSPECTION_SCHEDULED             (with inspector)
 *   Inspector files evidence →  PENDING_HOD_APPROVAL             (back to HOD)
 *   HOD approves             →  PENDING_PS_APPROVAL
 *   PS approves              →  PENDING_COMMISSIONER_APPROVAL
 *   Commissioner approves    →  APPROVED  (certificate issued, park synced)
 *
 * Note the two distinct PS stages: PENDING_PS_INSPECTION_APPROVAL clears the
 * inspection SCHEDULE before anyone attends site; PENDING_PS_APPROVAL is the
 * later sign-off on the completed application.
 */

import { db } from "@/lib/db";
import { requireRole, requireAuth, authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const HOD_ROLES = [
  "HOD_PARKS_REVALIDATION",
  "HOD_PARKS",
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "SYSTEM_ADMIN",
] as const;

const PS_ROLES = ["PERMANENT_SECRETARY", "COMMISSIONER", "SYSTEM_ADMIN"] as const;

function touch(applicationId: string) {
  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue`);
  revalidatePath(`/revalidation`);
}

export async function scheduleRevalidationInspection(
  applicationId: string,
  inspectorId: string,
  inspectionDateStr: string,
) {
  await requireRole([
    "HOD_PARKS_REVALIDATION",
    "HOD_PARKS",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
  ]);

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      inspectionOfficerId: inspectorId,
      inspectionDate: new Date(inspectionDateStr),
      // The schedule goes to the PS for clearance before the inspector attends.
      status: "PENDING_PS_INSPECTION_APPROVAL",
      inspectionApprovedAt: null,
      inspectionApprovedByUserId: null,
      inspectionRejectionReason: null,
    },
  });

  await recordAudit({
    action: "REVALIDATION_INSPECTION_SCHEDULED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `Inspection scheduled for ${app.parkName}; awaiting PS clearance`,
    newValues: { status: "PENDING_PS_INSPECTION_APPROVAL", inspectorId },
  });

  touch(applicationId);
  return { success: true, data: app };
}

// ── PS clearance of the inspection schedule ─────────────────────────────────

export async function psApproveInspectionSchedule(applicationId: string) {
  const authz = await authorize([...PS_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, parkName: true, inspectionOfficerId: true },
  });
  if (!current) return { success: false, error: "Application not found." };
  if (current.status !== "PENDING_PS_INSPECTION_APPROVAL") {
    return {
      success: false,
      error: `This inspection is not awaiting PS clearance (currently ${current.status}).`,
    };
  }
  if (!current.inspectionOfficerId) {
    return {
      success: false,
      error: "No inspector is assigned. Ask the HOD to reschedule.",
    };
  }

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      status: "INSPECTION_SCHEDULED",
      inspectionApprovedAt: new Date(),
      inspectionApprovedByUserId: authz.session.userId,
      inspectionRejectionReason: null,
    },
  });

  await recordAudit({
    action: "REVALIDATION_INSPECTION_PS_APPROVED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `PS cleared the inspection schedule for ${app.parkName}; released to the inspector`,
    oldValues: { status: current.status },
    newValues: { status: "INSPECTION_SCHEDULED" },
  });

  touch(applicationId);
  return { success: true, data: app };
}

export async function psRejectInspectionSchedule(
  applicationId: string,
  reason: string,
) {
  const authz = await authorize([...PS_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };
  if (!reason?.trim()) {
    return { success: false, error: "A reason is required when rejecting." };
  }

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, parkName: true },
  });
  if (!current) return { success: false, error: "Application not found." };
  if (current.status !== "PENDING_PS_INSPECTION_APPROVAL") {
    return {
      success: false,
      error: `This inspection is not awaiting PS clearance (currently ${current.status}).`,
    };
  }

  // Returns to the HOD to reschedule — the application itself is not rejected.
  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      status: "SUBMITTED",
      inspectionRejectionReason: reason.trim(),
      inspectionOfficerId: null,
      inspectionDate: null,
    },
  });

  await recordAudit({
    action: "REVALIDATION_INSPECTION_PS_REJECTED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `PS rejected the inspection schedule for ${app.parkName}: ${reason.trim()}`,
    newValues: { status: "SUBMITTED" },
  });

  touch(applicationId);
  return { success: true, data: app };
}

export async function submitRevalidationFindings(
  applicationId: string,
  findings: string,
  recommendation: string,
  evidenceUrls: { url: string; caption?: string }[] = [],
) {
  const session = await requireAuth();

  const current = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, parkName: true, inspectionOfficerId: true },
  });
  if (!current) return { success: false, error: "Application not found." };

  if (current.status !== "INSPECTION_SCHEDULED") {
    return {
      success: false,
      error:
        current.status === "PENDING_PS_INSPECTION_APPROVAL"
          ? "The PS has not yet cleared this inspection schedule."
          : `This application is not ready for inspection (currently ${current.status}).`,
    };
  }

  // Only the assigned officer may file the report — previously any signed-in
  // user could submit findings against any application.
  const isAssigned = current.inspectionOfficerId === session.userId;
  const isOverride =
    session.role === "SYSTEM_ADMIN" ||
    session.role === "HOD_PARKS_REVALIDATION" ||
    session.role === "HOD_PARKS";
  if (!isAssigned && !isOverride) {
    return {
      success: false,
      error: "Only the assigned inspection officer can submit these findings.",
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

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      findings: findings.trim(),
      recommendation,
      evidenceUrls: evidenceUrls as never,
      inspectionCompletedAt: new Date(),
      // Back to the HOD. This previously set INSPECTION_COMPLETED, a state the
      // queue had no branch for, so the application became unactionable.
      status: "PENDING_HOD_APPROVAL",
    },
  });

  await recordAudit({
    action: "REVALIDATION_INSPECTION_COMPLETED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `Inspection findings filed for ${app.parkName} with ${evidenceUrls.length} evidence item(s); returned to HOD`,
    newValues: { status: "PENDING_HOD_APPROVAL", recommendation },
  });

  touch(applicationId);
  return { success: true, data: app };
}

export async function hodApproveRevalidation(applicationId: string) {
  await requireRole([
    "HOD_PARKS_REVALIDATION",
    "HOD_PARKS",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
  ]);

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      hodApprovedAt: new Date(),
      status: "PENDING_PS_APPROVAL",
    },
  });

  await recordAudit({
    action: "REVALIDATION_HOD_APPROVED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `HOD approved revalidation for ${app.parkName}; forwarded to the PS`,
    newValues: { status: "PENDING_PS_APPROVAL" },
  });

  touch(applicationId);
  return { success: true, data: app };
}

export async function psApproveRevalidation(applicationId: string) {
  await requireRole([
    "PERMANENT_SECRETARY",
    "COMMISSIONER",
    "SYSTEM_ADMIN",
  ]);

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      psApprovedAt: new Date(),
      status: "PENDING_COMMISSIONER_APPROVAL",
    },
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

export async function commissionerApproveRevalidation(applicationId: string) {
  await requireRole(["COMMISSIONER", "SYSTEM_ADMIN"]);

  const currentYear = new Date().getFullYear();
  const count = await db.revalidationApplication.count({
    where: {
      status: "APPROVED",
      approvedAt: {
        gte: new Date(currentYear, 0, 1),
      },
    },
  });
  const seq = String(count + 1).padStart(4, "0");
  const revalidationNumber = `AN-REV-${currentYear}-${seq}`;

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      commissionerApprovedAt: new Date(),
      approvedAt: new Date(),
      revalidationNumber,
      validUntil,
      status: "APPROVED",
    },
  });

  // Look up existing MotorPark by motorParkId, ASIN number, permit number, or applicant user ID
  let existingPark = null;

  if (app.motorParkId) {
    existingPark = await db.motorPark.findUnique({
      where: { id: app.motorParkId },
    });
  }

  if (!existingPark && app.asinNumber) {
    existingPark = await db.motorPark.findFirst({
      where: {
        OR: [
          { anssidNumber: { equals: app.asinNumber, mode: "insensitive" as const } },
          ...(app.existingApprovalNum ? [{ permitNumber: { equals: app.existingApprovalNum, mode: "insensitive" as const } }] : []),
          { contactUserId: app.applicantUserId },
        ],
      },
    });
  }

  if (existingPark) {
    // Update EXISTING MotorPark — NEVER create a duplicate record
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
        managerResidentialAddress: app.residentialAddress || existingPark.managerResidentialAddress,
        cacRegistrationNumber: app.cacRegistrationNumber || existingPark.cacRegistrationNumber,
        lastRevalidatedAt: new Date(),
        nextRevalidationDue: validUntil,
        applicationStatus: "APPROVED",
        permitStatus: "ACTIVE",
        permitExpiresAt: validUntil,
        permitNumber: existingPark.permitNumber || revalidationNumber,
        permitIssuedAt: existingPark.permitIssuedAt || new Date(),
      },
    });
  } else {
    // Create new MotorPark only if no existing record exists anywhere
    await db.motorPark.create({
      data: {
        businessName: app.parkName,
        transportCompanyName: app.ownerName,
        streetAddress: app.physicalLocation,
        lga: app.lga,
        townCity: app.townCommunity,
        anssidNumber: app.asinNumber,
        cacRegistrationNumber: app.cacRegistrationNumber,
        contactUserId: app.applicantUserId,
        contactPerson: app.representativeName,
        contactPhone: app.phoneNumber,
        contactEmail: app.emailAddress,
        managerResidentialAddress: app.residentialAddress,
        applicationStatus: "APPROVED",
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
    changeDescription: `Commissioner approved revalidation for ${app.parkName}; certificate ${revalidationNumber} issued, valid to ${validUntil.toDateString()}`,
    newValues: { status: "APPROVED", revalidationNumber },
  });

  touch(applicationId);
  revalidatePath(`/motor-parks`);
  return { success: true, data: app };
}

export async function rejectRevalidation(applicationId: string) {
  await requireRole([
    "HOD_PARKS_REVALIDATION",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
  ]);

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
    },
  });

  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue`);
  return { success: true, data: app };
}
