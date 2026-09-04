"use server";

/**
 * Triage of the imported revalidation queue.
 *
 * 257 records came across from the previous vendor and all of them landed in
 * the revalidation queue as motor parks. Two things are wrong with that, and
 * neither can be fixed from the data:
 *
 *   1. Some of them are mass transit operators, not motor parks. The vendor
 *      captured no operator category, only service types and an ownership
 *      type, so the distinction has to be made by an officer.
 *
 *   2. Revalidation is for an operator who already holds an approval. The
 *      vendor's export contains no approval, permit, licence or certificate
 *      field at all — 48 columns, not one of them about approval — so who
 *      holds one is unknowable from the import. An operator with no approval
 *      is a first-time applicant and belongs in the normal application
 *      process, not this queue.
 *
 * Both decisions are therefore judgment, made by the HOD of Operations. The
 * decision is the only evidence that will ever exist for it, so who made it,
 * when, and on what basis are all recorded.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

import { checkDuplicatePlateNumber } from "@/lib/plate-validation";
import type { VehicleType } from "@prisma/client";

/** Classifying is a filing decision — both HODs and the administrators. */
const CLASSIFY_ROLES = [
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS_REVALIDATION",
  "SYSTEM_ADMIN",
  "ADMIN",
] as const;

/** Roles permitted to onboard vehicles onto a mass transit revalidation record. */
const ADD_VEHICLE_ROLES = [
  "ENUMERATOR",
  "ADMIN",
  "SYSTEM_ADMIN",
  "HOD_TRANSPORT_OPS",
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
] as const;

/**
 * Routing decides whether an operator revalidates or starts afresh, which
 * changes what they must produce. The HOD of Operations owns it.
 */
const ROUTE_ROLES = ["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN", "ADMIN"] as const;

export type ServiceCategory = "MOTOR_PARK" | "MASS_TRANSIT";
export type TriageRoute = "REVALIDATION" | "NEW_APPLICATION";

/**
 * Ensure a MassTransitCompany record exists and is linked to the revalidation
 * application. If the application is already classified as MASS_TRANSIT, it
 * guarantees a target company so enumerators and officers can add vehicles
 * immediately without waiting for final approval.
 */
export async function ensureMassTransitCompanyForRevalidation(
  applicationId: string,
): Promise<{ success: true; companyId: string } | { success: false; error: string }> {
  const app = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      serviceCategory: true,
      massTransitCompanyId: true,
      parkName: true,
      ownerName: true,
      asinNumber: true,
      cacRegistrationNumber: true,
      representativeName: true,
      emailAddress: true,
      phoneNumber: true,
      applicantUserId: true,
    },
  });

  if (!app) return { success: false, error: "Application not found." };
  if (app.serviceCategory !== "MASS_TRANSIT") {
    return {
      success: false,
      error: "Application is not classified as Mass Transit.",
    };
  }

  // Already linked and exists?
  if (app.massTransitCompanyId) {
    const existing = await db.massTransitCompany.findUnique({
      where: { id: app.massTransitCompanyId },
      select: { id: true },
    });
    if (existing) return { success: true, companyId: existing.id };
  }

  // Try matching by ASIN
  let company = app.asinNumber
    ? await db.massTransitCompany.findFirst({
        where: { asinNumber: app.asinNumber },
        select: { id: true },
      })
    : null;

  if (!company) {
    company = await db.massTransitCompany.create({
      data: {
        companyName: app.ownerName?.trim() || app.parkName.trim(),
        contactPerson: app.representativeName || null,
        contactEmail: app.emailAddress || null,
        contactPhone: app.phoneNumber || null,
        contactUserId: app.applicantUserId || null,
        asinNumber: app.asinNumber || null,
        cacNumber: app.cacRegistrationNumber || null,
        applicationStatus: "SUBMITTED",
      },
      select: { id: true },
    });
  }

  await db.revalidationApplication.update({
    where: { id: applicationId },
    data: { massTransitCompanyId: company.id },
  });

  return { success: true, companyId: company.id };
}

/**
 * Mark an application as a motor park or a mass transit operator.
 *
 * This does not move the record. The application keeps its place in the
 * queue, its inspection and its history; what changes is where it is approved
 * to — a mass transit record becomes a MassTransitCompany with its terminals,
 * and each terminal then becomes a motor park exactly as it does today.
 *
 * When marked as MASS_TRANSIT, it immediately prepares the linked company
 * so Enumerators and Admins can start adding vehicles right away.
 */
export async function classifyRevalidationApplication(
  applicationId: string,
  category: ServiceCategory,
  note?: string,
) {
  const authz = await authorize([...CLASSIFY_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (category !== "MOTOR_PARK" && category !== "MASS_TRANSIT") {
    return { success: false, error: "Choose either motor park or mass transit." };
  }

  const app = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: { parkName: true, serviceCategory: true, status: true },
  });
  if (!app) return { success: false, error: "Application not found." };

  // Once approved the record has already become a park or a company, and
  // reclassifying would leave the wrong one behind.
  if (app.status === "APPROVED") {
    return {
      success: false,
      error:
        "This application has already been approved — its category can no longer be changed.",
    };
  }

  await db.revalidationApplication.update({
    where: { id: applicationId },
    data: { serviceCategory: category },
  });

  // If marked as MASS_TRANSIT, prepare linked company so fleet onboarding is enabled
  if (category === "MASS_TRANSIT") {
    await ensureMassTransitCompanyForRevalidation(applicationId);
  }

  await recordAudit({
    action: "REVALIDATION_CLASSIFIED",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription: `${app.parkName} classified as ${
      category === "MASS_TRANSIT" ? "mass transit" : "motor park"
    }${note?.trim() ? `: ${note.trim()}` : ""}`,
    oldValues: { serviceCategory: app.serviceCategory },
    newValues: { serviceCategory: category },
  });

  revalidatePath("/admin/revalidation-queue");
  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath("/fleet-operators");
  return { success: true, data: { serviceCategory: category } };
}

export interface RevalidationVehicleInput {
  registrationNumber: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  stickerNumber?: string;
  routesServed?: string;
  roadworthinessExpiry?: string;
}

/**
 * Onboard a single fleet vehicle to an application on the Revalidation Queue
 * that has been marked as Mass Transit.
 *
 * Accessible by: ENUMERATOR, ADMIN, SYSTEM_ADMIN, HOD_TRANSPORT_OPS.
 * Does NOT require the application to complete approval first.
 */
export async function addVehicleToRevalidation(
  applicationId: string,
  input: RevalidationVehicleInput,
) {
  const authz = await authorize([...ADD_VEHICLE_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  const app = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      parkName: true,
      serviceCategory: true,
      massTransitCompanyId: true,
    },
  });

  if (!app) return { success: false, error: "Application not found." };
  if (app.serviceCategory !== "MASS_TRANSIT") {
    return {
      success: false,
      error:
        "This application has not been marked as Mass Transit by the transport operations officer.",
    };
  }

  const reg = input.registrationNumber.trim().toUpperCase();
  const make = input.make.trim();
  const model = input.model.trim();
  const engine = input.engineNumber.trim().toUpperCase();
  const chassis = input.chassisNumber.trim().toUpperCase();

  if (!reg) return { success: false, error: "Registration / plate number is required." };
  if (!make) return { success: false, error: "Vehicle make is required." };
  if (!model) return { success: false, error: "Vehicle model is required." };
  if (!engine) return { success: false, error: "Engine number is required." };
  if (!chassis) return { success: false, error: "Chassis number is required." };

  // Check collision across all modules (CVR, TRACAS, Mass Transit)
  const plateCheck = await checkDuplicatePlateNumber(reg);
  if (plateCheck.isTaken) {
    return {
      success: false,
      error: plateCheck.message || `A vehicle with plate number '${reg}' already exists.`,
    };
  }

  // Check engine and chassis uniqueness
  const [existingEngine, existingChassis] = await Promise.all([
    db.vehicle.findUnique({ where: { engineNumber: engine }, select: { id: true } }),
    db.vehicle.findUnique({ where: { chassisNumber: chassis }, select: { id: true } }),
  ]);

  if (existingEngine) {
    return { success: false, error: "A vehicle with this engine number already exists." };
  }
  if (existingChassis) {
    return { success: false, error: "A vehicle with this chassis number already exists." };
  }

  // Ensure MassTransitCompany exists
  const companyRes = await ensureMassTransitCompanyForRevalidation(applicationId);
  if (!companyRes.success) return companyRes;
  const companyId = companyRes.companyId;

  const vehicle = await db.$transaction(async (tx) => {
    const v = await tx.vehicle.create({
      data: {
        companyId,
        registrationNumber: reg,
        vehicleType: input.vehicleType,
        make,
        model,
        engineNumber: engine,
        chassisNumber: chassis,
        stickerNumber: input.stickerNumber?.trim() || null,
        routesServed: input.routesServed?.trim() || null,
        roadworthinessExpiry: input.roadworthinessExpiry
          ? new Date(input.roadworthinessExpiry)
          : null,
        addedByUserId: authz.session.userId,
      },
      select: { id: true, registrationNumber: true },
    });

    const actualTotal = await tx.vehicle.count({
      where: { companyId, removedAt: null },
    });

    await tx.massTransitCompany.update({
      where: { id: companyId },
      data: { currentFleetSize: actualTotal },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: authz.session.userId,
        action: "VEHICLE_ADDED",
        entityType: "REVALIDATION",
        entityId: applicationId,
        changeDescription: `Vehicle ${v.registrationNumber} (${input.vehicleType}) added to mass transit fleet for ${app.parkName}`,
      },
    });

    return v;
  });

  revalidatePath("/admin/revalidation-queue");
  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  revalidatePath("/fleet-operators");
  revalidatePath(`/fleet-operators/${companyId}`);

  return { success: true, data: { vehicleId: vehicle.id, companyId } };
}

/**
 * Decide whether this operator revalidates or applies afresh.
 *
 * Both routes leave the application workable. The decision is recorded on
 * triageRoute and shown to the officers; it does not park the record.
 *
 * NEW_APPLICATION means the operator holds no existing approval and is
 * therefore a first-time applicant — they must meet the documents and site
 * evidence a new application requires, which the Ministry has confirmed are
 * not waived. It does NOT mean the record stops here: the inspection is
 * still scheduled and the chain still runs.
 */
export async function routeRevalidationApplication(
  applicationId: string,
  route: TriageRoute,
  input: { basis: string; approvalNumber?: string },
) {
  const authz = await authorize([...ROUTE_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  const basis = input.basis?.trim();
  if (!basis) {
    return {
      success: false,
      error:
        "Record why. Nothing in the imported data supports this either way, so this note is the only evidence for the decision.",
    };
  }

  const approvalNumber = input.approvalNumber?.trim() || null;

  if (route === "REVALIDATION" && !approvalNumber) {
    // Not fatal — an approval may exist on paper with no number to hand — but
    // it is the field Section F is missing, so it is worth pressing for.
    // Recorded in the basis note instead.
  }

  const app = await db.revalidationApplication.findUnique({
    where: { id: applicationId },
    select: {
      parkName: true,
      status: true,
      triageRoute: true,
      existingApprovalNum: true,
    },
  });
  if (!app) return { success: false, error: "Application not found." };

  if (app.status === "APPROVED") {
    return {
      success: false,
      error:
        "This application has already been approved and cannot be re-routed.",
    };
  }

  await db.revalidationApplication.update({
    where: { id: applicationId },
    data: {
      triageRoute: route,
      triageBasis: basis,
      triagedByUserId: authz.session.userId,
      triagedAt: new Date(),
      // Capturing the approval number here fills the Section F field the
      // vendor's export never carried.
      ...(approvalNumber ? { existingApprovalNum: approvalNumber } : {}),
      // Triage is a routing decision, not a halt, so it does not move the
      // status — except to release a record that an earlier version parked as
      // WAITLISTED, which took it out of the schedulable statuses and left it
      // stranded with no inspection bookable. Anything already progressed
      // keeps the stage it has reached.
      ...(app.status === "WAITLISTED" ? { status: "SUBMITTED" as const } : {}),
    },
  });

  await recordAudit({
    action:
      route === "REVALIDATION"
        ? "REVALIDATION_ROUTE_CONFIRMED"
        : "REVALIDATION_ROUTED_TO_NEW_APPLICATION",
    entityType: "REVALIDATION",
    entityId: applicationId,
    changeDescription:
      route === "REVALIDATION"
        ? `${app.parkName} confirmed for revalidation${
            approvalNumber ? ` against approval ${approvalNumber}` : ""
          }: ${basis}`
        : `${app.parkName} holds no approval and was routed to a fresh application: ${basis}`,
    oldValues: { triageRoute: app.triageRoute },
    newValues: { triageRoute: route, existingApprovalNum: approvalNumber },
  });

  revalidatePath("/admin/revalidation-queue");
  revalidatePath(`/admin/revalidation-queue/${applicationId}`);
  return { success: true, data: { triageRoute: route } };
}
