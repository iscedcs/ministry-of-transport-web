"use server";

/**
 * Completing a record an Enumerator captured in the field.
 *
 * A field capture is deliberately incomplete: the agent is standing at the
 * park, where the owner's contact details and the operator's documents — CAC
 * certificate, land agreement — are usually not to hand. It is stored as a
 * DRAFT, owned by nobody, with the Enumerator recorded as the capturer.
 *
 * Two things then have to happen before it is an application:
 *
 *   1. An officer fills in the owner. If the owner has an account it is
 *      linked, so the park appears on THEIR dashboard rather than the
 *      Enumerator's.
 *   2. The record is submitted, which validates against the full application
 *      schema. The Ministry has not waived the documents or the site
 *      evidence — they are required here rather than in the field.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { motorParkApplicationSchema } from "@/lib/validation-schemas";
import { revalidatePath } from "next/cache";

/**
 * Who may complete a captured record.
 *
 * The HODs own the application chain; ADMIN is the Anambra team lead, who
 * makes the same corrections without needing the System Administrator.
 */
const COMPLETE_ROLES = [
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS_REVALIDATION",
  "HOD_PARKS",
  "SYSTEM_ADMIN",
  "ADMIN",
] as const;

export interface OwnerDetails {
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  managerResidentialAddress?: string;
  cacRegistrationNumber?: string;
  /** Link the record to an existing applicant account, if one is known. */
  contactUserId?: string | null;
}

/**
 * Fill in the owner on a captured motor park.
 *
 * Where an account is given the park is handed over to it. That is the whole
 * point of leaving contactUserId null at capture: ownership moves to the
 * operator, not to whoever typed the record in.
 */
export async function fillParkOwnerDetails(
  parkId: string,
  owner: OwnerDetails,
) {
  const authz = await authorize([...COMPLETE_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: {
      businessName: true,
      contactUserId: true,
      contactPerson: true,
      applicationStatus: true,
    },
  });
  if (!park) return { success: false, error: "Motor park not found." };

  // Guard against handing a park to an account that does not exist.
  if (owner.contactUserId) {
    const user = await db.user.findUnique({
      where: { id: owner.contactUserId },
      select: { id: true },
    });
    if (!user) return { success: false, error: "That applicant account was not found." };
  }

  await db.motorPark.update({
    where: { id: parkId },
    data: {
      ...(owner.contactPerson !== undefined
        ? { contactPerson: owner.contactPerson }
        : {}),
      ...(owner.contactPhone !== undefined
        ? { contactPhone: owner.contactPhone }
        : {}),
      ...(owner.contactEmail !== undefined
        ? { contactEmail: owner.contactEmail }
        : {}),
      ...(owner.managerResidentialAddress !== undefined
        ? { managerResidentialAddress: owner.managerResidentialAddress }
        : {}),
      ...(owner.cacRegistrationNumber !== undefined
        ? { cacRegistrationNumber: owner.cacRegistrationNumber }
        : {}),
      ...(owner.contactUserId !== undefined
        ? { contactUserId: owner.contactUserId }
        : {}),
    },
  });

  await recordAudit({
    action: "MOTOR_PARK_OWNER_DETAILS_FILLED",
    entityType: "MOTOR_PARK",
    entityId: parkId,
    changeDescription: owner.contactUserId
      ? `Owner details completed for ${park.businessName} and the record handed to the operator's account`
      : `Owner details completed for ${park.businessName}`,
    oldValues: {
      contactPerson: park.contactPerson,
      contactUserId: park.contactUserId,
    },
    newValues: {
      contactPerson: owner.contactPerson,
      contactUserId: owner.contactUserId,
    },
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");
  return { success: true };
}

/**
 * Turn a completed draft into a real application.
 *
 * This is where the document and evidence requirement is enforced. The full
 * application schema must pass — the same one an operator applying through
 * the portal has to satisfy — so a field capture cannot short-circuit it.
 * Whatever is still missing is named, so the officer knows what to chase.
 */
export async function submitCapturedPark(parkId: string) {
  const authz = await authorize([...COMPLETE_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  const park = await db.motorPark.findUnique({ where: { id: parkId } });
  if (!park) return { success: false, error: "Motor park not found." };

  if (park.applicationStatus !== "DRAFT") {
    return {
      success: false,
      error: "This record has already been submitted.",
    };
  }

  const parsed = motorParkApplicationSchema.safeParse({
    businessName: park.businessName,
    transportCompanyName: park.transportCompanyName ?? undefined,
    streetAddress: park.streetAddress,
    lga: park.lga,
    townCity: park.townCity,
    gpsCoordinates: park.gpsCoordinates ?? undefined,
    cacRegistrationNumber: park.cacRegistrationNumber ?? undefined,
    anssidNumber: park.anssidNumber,
    contactPerson: park.contactPerson,
    contactPhone: park.contactPhone,
    contactEmail: park.contactEmail,
    managerResidentialAddress: park.managerResidentialAddress ?? undefined,
    nextOfKinName: park.nextOfKinName ?? undefined,
    nextOfKinPhone: park.nextOfKinPhone ?? undefined,
    landOwnershipDocId: park.landOwnershipDocId ?? undefined,
    cacDocumentId: park.cacDocumentId ?? undefined,
    corporateAsinDocumentId: park.corporateAsinDocumentId ?? undefined,
    toiletPhotoId: park.toiletPhotoId ?? undefined,
    waitingAreaPhotoId: park.waitingAreaPhotoId ?? undefined,
    signagePhotoId: park.signagePhotoId ?? undefined,
    waterFacilityPhotoId: park.waterFacilityPhotoId ?? undefined,
    cctvPhotoId: park.cctvPhotoId ?? undefined,
  });

  if (!parsed.success) {
    // Name everything outstanding at once — chasing an operator once for five
    // items beats chasing them five times.
    const missing = [...new Set(parsed.error.issues.map((i) => i.message))];
    return {
      success: false,
      error: `Still outstanding: ${missing.join("; ")}`,
    };
  }

  await db.motorPark.update({
    where: { id: parkId },
    data: { applicationStatus: "SUBMITTED" },
  });

  // The fee is raised now — at capture there was nobody to bill.
  const existingFee = await db.motorParkFee.findFirst({
    where: { motorParkId: parkId, feeType: "APPLICATION" },
    select: { id: true },
  });
  if (!existingFee) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    await db.motorParkFee.create({
      data: {
        motorParkId: parkId,
        feeType: "APPLICATION",
        amount: 5000000, // ₦50,000 in kobo
        dueDate,
        status: "PENDING",
      },
    });
  }

  await recordAudit({
    action: "MOTOR_PARK_APPLICATION_SUBMITTED",
    entityType: "MOTOR_PARK",
    entityId: parkId,
    changeDescription: `${park.businessName} submitted from a field capture`,
    oldValues: { applicationStatus: "DRAFT" },
    newValues: { applicationStatus: "SUBMITTED" },
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");
  return { success: true };
}


// ── Mass transit ────────────────────────────────────────────────────────────

/**
 * Fill in the owner on a captured mass transit company.
 *
 * Same rule as a park: where an account is given, the company is handed over
 * to it, so the operator sees their own record rather than the Enumerator.
 */
export async function fillCompanyOwnerDetails(
  companyId: string,
  owner: OwnerDetails & { cacNumber?: string },
) {
  const authz = await authorize([...COMPLETE_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: { companyName: true, contactUserId: true, contactPerson: true },
  });
  if (!company) return { success: false, error: "Fleet operator not found." };

  if (owner.contactUserId) {
    const user = await db.user.findUnique({
      where: { id: owner.contactUserId },
      select: { id: true },
    });
    if (!user) {
      return { success: false, error: "That applicant account was not found." };
    }
  }

  // CAC is unique where present, so a clash has to be reported rather than
  // thrown from the database.
  if (owner.cacNumber) {
    const clash = await db.massTransitCompany.findFirst({
      where: { cacNumber: owner.cacNumber, id: { not: companyId } },
      select: { companyName: true },
    });
    if (clash) {
      return {
        success: false,
        error: `That CAC number is already held by ${clash.companyName}.`,
      };
    }
  }

  await db.massTransitCompany.update({
    where: { id: companyId },
    data: {
      ...(owner.contactPerson !== undefined
        ? { contactPerson: owner.contactPerson }
        : {}),
      ...(owner.contactPhone !== undefined
        ? { contactPhone: owner.contactPhone }
        : {}),
      ...(owner.contactEmail !== undefined
        ? { contactEmail: owner.contactEmail }
        : {}),
      ...(owner.cacNumber !== undefined ? { cacNumber: owner.cacNumber } : {}),
      ...(owner.contactUserId !== undefined
        ? { contactUserId: owner.contactUserId }
        : {}),
    },
  });

  await recordAudit({
    action: "MASS_TRANSIT_OWNER_DETAILS_FILLED",
    entityType: "MASS_TRANSIT",
    entityId: companyId,
    changeDescription: owner.contactUserId
      ? `Owner details completed for ${company.companyName} and the record handed to the operator's account`
      : `Owner details completed for ${company.companyName}`,
    oldValues: {
      contactPerson: company.contactPerson,
      contactUserId: company.contactUserId,
    },
    newValues: {
      contactPerson: owner.contactPerson,
      contactUserId: owner.contactUserId,
    },
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  revalidatePath("/fleet-operators");
  return { success: true };
}

/**
 * Turn a captured fleet operator into a real application.
 *
 * Checked against what the current mass transit flow actually asks for —
 * company identity, the three documents, the facility photographs and at
 * least one terminal — rather than the older whole-fleet schema, which is no
 * longer what the form collects.
 */
export async function submitCapturedCompany(companyId: string) {
  const authz = await authorize([...COMPLETE_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    include: { terminals: { select: { id: true } } },
  });
  if (!company) return { success: false, error: "Fleet operator not found." };

  if (company.applicationStatus !== "DRAFT") {
    return { success: false, error: "This record has already been submitted." };
  }

  const missing: string[] = [];
  if (!company.contactPerson?.trim()) missing.push("contact person");
  if (!company.contactPhone?.trim()) missing.push("contact phone");
  if (!company.contactEmail?.trim()) missing.push("contact email");
  if (!company.cacNumber?.trim()) missing.push("CAC number");
  if (!company.asinNumber?.trim()) missing.push("ASIN number");
  if (!company.cacDocumentId) missing.push("CAC certificate");
  if (!company.landOwnershipDocId) missing.push("land ownership document");
  if (!company.corporateAsinDocumentId) missing.push("corporate ASIN certificate");
  // Facility photographs are deliberately NOT required: a terminal without a
  // borehole cannot photograph one. What the terminal actually has is
  // declared in facilitiesAvailable and settled at the inspection.
  if (company.terminals.length === 0) missing.push("at least one terminal");

  if (missing.length > 0) {
    return { success: false, error: `Still outstanding: ${missing.join("; ")}` };
  }

  await db.massTransitCompany.update({
    where: { id: companyId },
    data: { applicationStatus: "SUBMITTED" },
  });

  await recordAudit({
    action: "MASS_TRANSIT_APPLICATION_SUBMITTED",
    entityType: "MASS_TRANSIT",
    entityId: companyId,
    changeDescription: `${company.companyName} submitted from a field capture`,
    oldValues: { applicationStatus: "DRAFT" },
    newValues: { applicationStatus: "SUBMITTED" },
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  revalidatePath("/fleet-operators");
  return { success: true };
}
