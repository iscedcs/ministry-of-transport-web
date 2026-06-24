"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function scheduleRevalidationInspection(
  applicationId: string,
  inspectorId: string,
  date: string
) {
  await requireRole(["HOD_PARKS_REVALIDATION", "SYSTEM_ADMIN"]);

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      inspectionOfficerId: inspectorId,
      inspectionDate: new Date(date),
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
  recommendation: string
) {
  // Only field inspectors can submit findings
  await requireRole([
    "FIELD_INSPECTOR",
    "VEHICLE_INSPECTION_OFFICER",
    "SYSTEM_ADMIN",
  ]);

  const app = await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      findings,
      recommendation,
      status: "PENDING_HOD_APPROVAL",
    },
  });

  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath(`/admin/revalidation-queue`);
  return { success: true, data: app };
}

export async function hodApproveRevalidation(applicationId: string) {
  await requireRole(["HOD_PARKS_REVALIDATION", "SYSTEM_ADMIN"]);

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
  await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

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

  // Generate Revalidation Number
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
  validUntil.setFullYear(validUntil.getFullYear() + 1); // Valid for 1 year

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

  // Check if MotorPark already exists by ASIN
  const existingPark = await db.motorPark.findUnique({
    where: { anssidNumber: app.asinNumber },
  });

  if (existingPark) {
    await db.motorPark.update({
      where: { id: existingPark.id },
      data: {
        lastRevalidatedAt: new Date(),
        nextRevalidationDue: validUntil,
        applicationStatus: "APPROVED",
        permitStatus: "ACTIVE",
        permitExpiresAt: validUntil,
        permitNumber: revalidationNumber,
        permitIssuedAt: new Date(),
      },
    });
  } else {
    // Create new MotorPark from the Revalidation application
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
