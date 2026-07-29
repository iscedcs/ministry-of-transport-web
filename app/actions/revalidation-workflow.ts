"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
      status: "INSPECTION_SCHEDULED",
    },
  });

  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue`);
  return { success: true, data: app };
}

export async function submitRevalidationFindings(
  applicationId: string,
  findings: string,
  recommendation: string,
) {
  await requireAuth();

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      findings,
      recommendation,
      status: "INSPECTION_COMPLETED",
    },
  });

  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue`);
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

  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue`);
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

  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue`);
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

  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue`);
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
