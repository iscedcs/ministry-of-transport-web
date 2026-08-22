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

/** Classifying is a filing decision — both HODs and the administrators. */
const CLASSIFY_ROLES = [
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS_REVALIDATION",
  "SYSTEM_ADMIN",
  "ADMIN",
] as const;

/**
 * Routing decides whether an operator revalidates or starts afresh, which
 * changes what they must produce. The HOD of Operations owns it.
 */
const ROUTE_ROLES = ["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN", "ADMIN"] as const;

export type ServiceCategory = "MOTOR_PARK" | "MASS_TRANSIT";
export type TriageRoute = "REVALIDATION" | "NEW_APPLICATION";

/**
 * Mark an application as a motor park or a mass transit operator.
 *
 * This does not move the record. The application keeps its place in the
 * queue, its inspection and its history; what changes is where it is approved
 * to — a mass transit record becomes a MassTransitCompany with its terminals,
 * and each terminal then becomes a motor park exactly as it does today.
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
  return { success: true, data: { serviceCategory: category } };
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
