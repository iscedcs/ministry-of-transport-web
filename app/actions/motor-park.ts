"use server";

/**
 * Motor Park Server Actions — Ministry of Transport Platform
 * Reference: docs/EPICS.md EPIC-002 (STORY-020 to STORY-033)
 * Functional Requirements: FR-010 through FR-019
 *
 * Workflow:
 *  External Applicant → submits application
 *  HOD Parks → schedules initial inspection
 *  Field Inspector → completes inspection checklist + report
 *  Commissioner/PS → issues "Permit to Build"
 *  Applicant → notifies construction complete → re-inspection requested
 *  HOD Parks → schedules re-inspection
 *  Field Inspector → proximity eval + re-inspection report
 *  Finance Officer → assesses fees/levy
 *  Commissioner/PS → issues final approval letter
 *  Annual revalidation → reminder emails, renewal workflow
 *  Commissioner/PS → revocation if non-compliant
 */

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isRevalidation } from "@/lib/application-type";
import { createRevalidationFromApplication } from "@/lib/revalidation-from-application";
import { getNumberSetting } from "@/lib/system-config";
import {
  requireAuth,
  requireRole,
  requireExecutive,
  canPerformInspections,
  canIssuePermits,
  authorize,
} from "@/lib/auth";
import { uploadDocument } from "@/lib/spaces";
import {
  motorParkApplicationSchema,
  motorParkFieldCaptureSchema,
  motorParkStatusUpdateSchema,
  motorParkFeeRecordSchema,
  inspectionChecklistResultSchema,
} from "@/lib/validation-schemas";
import type { ActionResult } from "@/lib/server-actions-pattern";

// ==================== MOTOR PARK APPLICATION ====================

/**
 * FR-010: External applicant submits a motor park application.
 * Validates input, creates MotorPark record, triggers routing notification (FR-011).
 */
export async function submitParkApplication(
  prevState: ActionResult<{ parkId: string; isRevalidation?: boolean }>,
  formData: FormData,
): Promise<ActionResult<{ parkId: string; isRevalidation?: boolean }>> {
  const session = await requireRole(["EXTERNAL_APPLICANT", "ENUMERATOR"]);

  const getCleanString = (
    val: unknown,
    isRequired = false,
  ): string | undefined => {
    if (
      val === null ||
      val === undefined ||
      val === "undefined" ||
      val === "null" ||
      val === ""
    ) {
      return isRequired ? "" : undefined;
    }
    return String(val).trim();
  };

  const raw = {
    businessName: getCleanString(formData.get("businessName"), true),
    facilityType: getCleanString(formData.get("facilityType")),
    transportCompanyName: getCleanString(formData.get("transportCompanyName")),
    streetAddress: getCleanString(formData.get("streetAddress"), true),
    lga: getCleanString(formData.get("lga"), true),
    townCity: getCleanString(formData.get("townCity"), true),
    gpsCoordinates: getCleanString(formData.get("gpsCoordinates")),
    cacRegistrationNumber: getCleanString(
      formData.get("cacRegistrationNumber"),
    ),
    anssidNumber: getCleanString(formData.get("anssidNumber"), true),
    // These are all relaxed to optional for a field capture (see
    // motorParkFieldCaptureSchema below), but forcing them required here
    // turned a blank field into "" instead of undefined — and an empty
    // string still fails .min(), optional() or not. The enumerator could
    // not submit with the owner's details left blank, exactly what field
    // capture is for.
    contactPerson: getCleanString(formData.get("contactPerson")),
    contactPhone: getCleanString(formData.get("contactPhone")),
    contactEmail: getCleanString(formData.get("contactEmail")),
    managerResidentialAddress: getCleanString(
      formData.get("managerResidentialAddress"),
    ),
    nextOfKinName: getCleanString(formData.get("nextOfKinName")),
    nextOfKinPhone: getCleanString(formData.get("nextOfKinPhone")),
    landOwnershipDocId: getCleanString(formData.get("landOwnershipDocId")),
    cacDocumentId: getCleanString(formData.get("cacDocumentId")),
    corporateAsinDocumentId: getCleanString(
      formData.get("corporateAsinDocumentId"),
    ),
    toiletPhotoId: getCleanString(formData.get("toiletPhotoId")),
    waitingAreaPhotoId: getCleanString(formData.get("waitingAreaPhotoId")),
    signagePhotoId: getCleanString(formData.get("signagePhotoId")),
    waterFacilityPhotoId: getCleanString(
      formData.get("waterFacilityPhotoId"),
    ),
    cctvPhotoId: getCleanString(formData.get("cctvPhotoId")),
  };

  // An Enumerator captures in the field, where the owner's details and the
  // operator's documents are usually not available. That capture is a DRAFT,
  // validated against a relaxed schema; it becomes an application only when
  // the full schema passes. See motorParkFieldCaptureSchema.
  const isFieldCapture = session.role === "ENUMERATOR";

  const parsed = isFieldCapture
    ? motorParkFieldCaptureSchema.safeParse(raw)
    : motorParkApplicationSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError.message };
  }

  const data = parsed.data;

  // An operator who already holds an approval fills in this same form and
  // ticks "Revalidation" at the top. That submission belongs in the
  // revalidation queue, not on the register as a second park.
  if (isRevalidation(formData.get("applicationType"))) {
    const seeded = await createRevalidationFromApplication({
      serviceCategory: "MOTOR_PARK",
      parkName: data.businessName,
      ownerName: data.transportCompanyName || data.contactPerson || data.businessName,
      asinNumber: data.anssidNumber,
      applicantUserId: isFieldCapture ? null : session.userId,
      cacRegistrationNumber: data.cacRegistrationNumber,
      representativeName: data.contactPerson,
      phoneNumber: data.contactPhone,
      emailAddress: data.contactEmail,
      residentialAddress: data.managerResidentialAddress,
      physicalLocation: data.streetAddress,
      townCommunity: data.townCity,
      lga: data.lga,
      facilityType: data.facilityType,
    });
    if (!seeded.success) return { success: false, error: seeded.error };

    await db.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "REVALIDATION_SUBMITTED_FROM_PARK_FORM",
        entityType: "REVALIDATION",
        entityId: seeded.data.revalidationId,
        changeDescription: `${data.businessName} submitted as a revalidation`,
      },
    });

    revalidatePath("/revalidation");
    return {
      success: true,
      data: { parkId: seeded.data.revalidationId, isRevalidation: true },
    };
  }

  // Check for duplicate ANSSID only (CAC is now optional and non-unique)
  const existingAnssid = await db.motorPark.findUnique({
    where: { anssidNumber: data.anssidNumber },
    select: { id: true },
  });

  if (existingAnssid) {
    return {
      success: false,
      error: "A motor park application with this ANSSID number already exists.",
    };
  }

  const motorPark = await db.motorPark.create({
    data: {
      businessName: data.businessName,
      facilityType: data.facilityType ?? null,
      transportCompanyName: data.transportCompanyName,
      streetAddress: data.streetAddress,
      lga: data.lga,
      townCity: data.townCity,
      gpsCoordinates: data.gpsCoordinates,
      cacRegistrationNumber: data.cacRegistrationNumber,
      anssidNumber: data.anssidNumber,
      // A field capture belongs to nobody until an owner is identified. It
      // must never be owned by the officer who typed it in — that would put
      // the park on the Enumerator's dashboard and give the operator no way
      // to reach their own record.
      contactUserId: isFieldCapture ? null : session.userId,
      capturedByUserId: isFieldCapture ? session.userId : null,
      contactPerson: data.contactPerson ?? "",
      contactPhone: data.contactPhone ?? "",
      contactEmail: data.contactEmail ?? "",
      managerResidentialAddress: data.managerResidentialAddress,
      nextOfKinName: data.nextOfKinName,
      nextOfKinPhone: data.nextOfKinPhone,
      landOwnershipDocId: data.landOwnershipDocId,
      cacDocumentId: data.cacDocumentId,
      corporateAsinDocumentId: data.corporateAsinDocumentId || null,
      toiletPhotoId: data.toiletPhotoId,
      waitingAreaPhotoId: data.waitingAreaPhotoId,
      signagePhotoId: data.signagePhotoId,
      waterFacilityPhotoId: data.waterFacilityPhotoId,
      cctvPhotoId: data.cctvPhotoId,
      // A field capture goes straight to the HOD queue; the owner details are
      // completed afterwards by the HOD, not before submission.
      applicationStatus: "SUBMITTED",
    },
    select: { id: true },
  });

  // The application fee is raised on submission, not on capture — there is
  // nobody to bill a draft, and a fee against no payer only produces an
  // overdue balance for a park that has not applied yet.
  if (!isFieldCapture) {
    const feeDueDate = new Date();
    feeDueDate.setDate(feeDueDate.getDate() + 7);

    await db.motorParkFee.create({
      data: {
        motorParkId: motorPark.id,
        feeType: "APPLICATION",
        amount: 5000000, // ₦50,000 in kobo
        dueDate: feeDueDate,
        status: "PENDING",
      },
    });
  }

  // Audit log
  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: isFieldCapture
        ? "MOTOR_PARK_CAPTURED_IN_FIELD"
        : "MOTOR_PARK_APPLICATION_SUBMITTED",
      entityType: "MOTOR_PARK",
      entityId: motorPark.id,
      changeDescription: isFieldCapture
        ? `${data.businessName} captured in the field; owner details outstanding`
        : `Application submitted for ${data.businessName}`,
    },
  });

  // TODO STORY-031: Queue notification to HOD Parks team via notification system
  revalidatePath("/motor-parks");

  return { success: true, data: { parkId: motorPark.id } };
}

// ==================== LISTING & FETCHING ====================

export type MotorParkListItem = {
  id: string;
  businessName: string;
  transportCompanyName: string | null;
  locationAddress: string;
  applicationStatus: string;
  permitStatus: string | null;
  appliedAt: Date;
  permitExpiresAt: Date | null;
  nextRevalidationDue: Date | null;
  contactPerson: string;
  contactPhone: string;
  staffCount: number;
  fees: Array<{
    id: string;
    amount: number;
    status: string;
    dueDate: Date;
  }>;
};

/**
 * List motor parks — filtered by role:
 *  - EXTERNAL_APPLICANT: own parks only
 *  - FIELD_INSPECTOR: parks with assigned inspections
 *  - HOD / Executive / Finance: all parks
 */
export async function listMotorParks(filters?: {
  status?: string;
  search?: string;
  /** Enumerator only: limit the list to records this officer captured. */
  mine?: boolean;
  page?: number;
  limit?: number;
}): Promise<ActionResult<{ parks: MotorParkListItem[]; total: number }>> {
  const session = await requireAuth();

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause for role-based access
  const where: Record<string, any> = {};

  if (session.role === "EXTERNAL_APPLICANT") {
    where.contactUserId = session.userId;
  }

  // An Enumerator works across the whole register, so their own field
  // captures are impossible to find among everyone else's records. This lets
  // the list narrow to what they captured.
  if (filters?.mine && session.role === "ENUMERATOR") {
    where.capturedByUserId = session.userId;
  }

  if (filters?.status && filters.status !== "ALL") {
    where.applicationStatus = filters.status;
  }

  // ── Search ────────────────────────────────────────────────────────────────
  // Matched by WORD, not by letter. Each word the officer types must appear
  // somewhere in the record, so "abba awka" finds Abba Park in Awka South and
  // not every park containing an "a".
  //
  // Two guards keep this off the database's back: a single character is
  // ignored (it would scan the table to return everything), and the number of
  // words is capped, since each one adds an OR group to the query.
  const terms = (filters?.search ?? "")
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 5);

  if (terms.length > 0) {
    // AND across words, OR across the columns each word may live in.
    where.AND = terms.map((term) => ({
      OR: [
        { businessName: { contains: term, mode: "insensitive" } },
        { transportCompanyName: { contains: term, mode: "insensitive" } },
        { cacRegistrationNumber: { contains: term, mode: "insensitive" } },
        { anssidNumber: { contains: term, mode: "insensitive" } },
        { parkId: { contains: term, mode: "insensitive" } },
        { permitNumber: { contains: term, mode: "insensitive" } },
        { townCity: { contains: term, mode: "insensitive" } },
        { lga: { contains: term, mode: "insensitive" } },
        { contactPerson: { contains: term, mode: "insensitive" } },
        { contactPhone: { contains: term } },
      ],
    }));
  }

  const [parks, total] = await Promise.all([
    db.motorPark.findMany({
      where,
      skip,
      take: limit,
      orderBy: { appliedAt: "desc" },
      select: {
        id: true,
        businessName: true,
        transportCompanyName: true,
        streetAddress: true,
        lga: true,
        townCity: true,
        applicationStatus: true,
        permitStatus: true,
        appliedAt: true,
        permitExpiresAt: true,
        nextRevalidationDue: true,
        contactPerson: true,
        contactPhone: true,
        fees: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
          },
          where: {
            status: "PENDING",
          },
        },
        _count: { select: { parkStaff: true } },
      },
    }),
    db.motorPark.count({ where }),
  ]);

  return {
    success: true,
    data: {
      parks: parks.map((p) => ({
        ...p,
        locationAddress: `${p.streetAddress}, ${p.lga} LGA, ${p.townCity}`,
        streetAddress: undefined,
        lga: undefined,
        townCity: undefined,
        staffCount: p._count.parkStaff,
        _count: undefined,
      })) as MotorParkListItem[],
      total,
    },
  };
}

export type MotorParkDetail = {
  id: string;
  businessName: string;
  transportCompanyName: string | null;
  locationAddress: string;
  streetAddress: string;
  lga: string;
  townCity: string;
  gpsCoordinates: string | null;
  cacRegistrationNumber: string | null;
  anssidNumber: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  managerResidentialAddress: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  applicationStatus: string;
  permitStatus: string | null;
  permitNumber: string | null;
  permitIssuedAt: Date | null;
  permitExpiresAt: Date | null;
  permitDocumentUrl: string | null;
  assessedFeeAmount: number | null;
  monthlyLevyAmount: number | null;
  lastRevalidatedAt: Date | null;
  nextRevalidationDue: Date | null;
  appliedAt: Date;
  hodApprovedAt: Date | null;
  psApprovedAt: Date | null;
  commissionerApprovedAt: Date | null;
  approvedAt: Date | null;
  approvedByUserId: string | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  cacDocumentId: string | null;
  landOwnershipDocId: string | null;
  corporateAsinDocumentId: string | null;
  toiletPhotoId: string | null;
  waitingAreaPhotoId: string | null;
  signagePhotoId: string | null;
  waterFacilityPhotoId: string | null;
  cctvPhotoId: string | null;
  facilitiesAvailable: unknown;
  maintainsManifest: boolean | null;
  operatorsRegistered: boolean | null;
  paymentsUpToDate: boolean | null;
  safetySignages: boolean | null;
  pendingSanctions: boolean | null;
  sanctionDetails: string | null;
  managementStaffCount: number | null;
  adminStaffCount: number | null;
  securityStaffCount: number | null;
  otherStaffCount: number | null;
  securityArrangement: string | null;
  operationalStatus: string | null;
  dailyVehiclesCount: string | null;
  nearPublicPark: boolean | null;
  publicParkDistanceM: number | null;
  nearMajorRoad: boolean | null;
  majorRoadDistanceM: number | null;
  nearIntersection: boolean | null;
  intersectionDistanceM: number | null;
  proximityVerdict: string | null;
  proximityNotes: string | null;
  documents: {
    cac?: ParkDocument;
    land?: ParkDocument;
    asin?: ParkDocument;
    toilet?: ParkDocument;
    waitingArea?: ParkDocument;
    signage?: ParkDocument;
    waterFacility?: ParkDocument;

    // cac?: {
    //   id: string;
    //   fileName: string;
    //   fileUrl: string;
    //   verifiedAt?: Date | null;
    //   verifiedByUserId?: string | null;
    //   verificationNotes?: string | null;
    // };
    // land?: {
    //   id: string;
    //   fileName: string;
    //   fileUrl: string;
    //   verifiedAt?: Date | null;
    //   verifiedByUserId?: string | null;
    //   verificationNotes?: string | null;
    // };
    // asin?: {
    //   id: string;
    //   fileName: string;
    //   fileUrl: string;
    //   verifiedAt?: Date | null;
    //   verifiedByUserId?: string | null;
    //   verificationNotes?: string | null;
    // };
    // toilet?: {
    //   id: string;
    //   fileName: string;
    //   fileUrl: string;
    //   verifiedAt?: Date | null;
    //   verifiedByUserId?: string | null;
    //   verificationNotes?: string | null;
    // };
    // waitingArea?: {
    //   id: string;
    //   fileName: string;
    //   fileUrl: string;
    //   verifiedAt?: Date | null;
    //   verifiedByUserId?: string | null;
    //   verificationNotes?: string | null;
    // };
    // signage?: {
    //   id: string;
    //   fileName: string;
    //   fileUrl: string;
    //   verifiedAt?: Date | null;
    //   verifiedByUserId?: string | null;
    //   verificationNotes?: string | null;
    // };
    // waterFacility?: {
    //   id: string;
    //   fileName: string;
    //   fileUrl: string;
    //   verifiedAt?: Date | null;
    //   verifiedByUserId?: string | null;
    //   verificationNotes?: string | null;
    // };
  };
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  inspectorTeam: {
    userId: string;
    isLead: boolean;
    comment: string | null;
    user: { firstName: string; lastName: string };
  }[];
  inspections: {
    id: string;
    inspectionType: string;
    status: string;
    scheduledDate: Date;
    assignedTo: { firstName: string; lastName: string };
    completedAt: Date | null;
    overallAssessment: string | null;
    recommendedAction: string | null;
    inspectionChecklist: unknown;
    evidenceUrls: unknown;
    checklist: {
      id: string;
      isCompliant: boolean;
      notes: string | null;
      photoUrls: string | null;
      score: number | null;
      checklistItem: {
        itemName: string;
        itemCategory: string;
        description: string | null;
        maxPoints: number;
      };
    }[];
  }[];
  fees: {
    id: string;
    feeType: string;
    amount: number;
    dueDate: Date;
    paidAt: Date | null;
    status: string;
  }[];
};

/**
 * Get full motor park detail.
 * RLS enforced — external applicants can only see their own park.
 */
export async function getMotorPark(
  parkId: string,
): Promise<ActionResult<MotorParkDetail>> {
  const session = await requireAuth();

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: {
      id: true,
      businessName: true,
      transportCompanyName: true,
      streetAddress: true,
      lga: true,
      townCity: true,
      gpsCoordinates: true,
      cacRegistrationNumber: true,
      anssidNumber: true,
      contactPerson: true,
      contactPhone: true,
      contactEmail: true,
      managerResidentialAddress: true,
      nextOfKinName: true,
      nextOfKinPhone: true,
      applicationStatus: true,
      permitStatus: true,
      permitNumber: true,
      permitIssuedAt: true,
      permitExpiresAt: true,
      permitDocumentUrl: true,
      assessedFeeAmount: true,
      monthlyLevyAmount: true,
      lastRevalidatedAt: true,
      nextRevalidationDue: true,
      appliedAt: true,
      hodApprovedAt: true,
      psApprovedAt: true,
      commissionerApprovedAt: true,
      capturedByUserId: true,
      approvedAt: true,
      approvedByUserId: true,
      revokedAt: true,
      revocationReason: true,
      cacDocumentId: true,
      landOwnershipDocId: true,
      corporateAsinDocumentId: true,
      toiletPhotoId: true,
      waitingAreaPhotoId: true,
      signagePhotoId: true,
      waterFacilityPhotoId: true,
      facilitiesAvailable: true,
      maintainsManifest: true,
      operatorsRegistered: true,
      paymentsUpToDate: true,
      safetySignages: true,
      pendingSanctions: true,
      sanctionDetails: true,
      managementStaffCount: true,
      adminStaffCount: true,
      securityStaffCount: true,
      otherStaffCount: true,
      securityArrangement: true,
      operationalStatus: true,
      dailyVehiclesCount: true,
      nearPublicPark: true,
      publicParkDistanceM: true,
      nearMajorRoad: true,
      majorRoadDistanceM: true,
      nearIntersection: true,
      intersectionDistanceM: true,
      proximityVerdict: true,
      proximityNotes: true,
      applicant: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      inspectorTeam: {
        select: {
          userId: true,
          isLead: true,
          comment: true,
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { isLead: "desc" },
      },
      inspections: {
        select: {
          id: true,
          inspectionType: true,
          status: true,
          scheduledDate: true,
          completedAt: true,
          overallAssessment: true,
          recommendedAction: true,
          inspectionChecklist: true,
          evidenceUrls: true,
          assignedTo: { select: { firstName: true, lastName: true } },
          checklist: {
            select: {
              id: true,
              isCompliant: true,
              notes: true,
              photoUrls: true,
              score: true,
              checklistItem: {
                select: {
                  itemName: true,
                  itemCategory: true,
                  description: true,
                  maxPoints: true,
                },
              },
            },
          },
        },
        orderBy: { scheduledDate: "desc" },
      },
      fees: {
        select: {
          id: true,
          feeType: true,
          amount: true,
          dueDate: true,
          paidAt: true,
          status: true,
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!park) return { success: false, error: "Motor park not found" };

  // RLS: external applicants can only view their own park.
  //
  // A field capture has no applicant yet, so this used to deny everyone and
  // the draft could not be opened at all. The Enumerator who captured it may
  // still open it — they are the one who has to finish it.
  const isCapturer =
    !!park.capturedByUserId && park.capturedByUserId === session.userId;

  if (
    session.role === "EXTERNAL_APPLICANT" &&
    park.applicant?.id !== session.userId &&
    !isCapturer
  ) {
    return { success: false, error: "Access denied" };
  }

  // Fetch documents
  const docIds = [
    park.cacDocumentId,
    park.landOwnershipDocId,
    park.corporateAsinDocumentId,
    park.toiletPhotoId,
    park.waitingAreaPhotoId,
    park.signagePhotoId,
    park.waterFacilityPhotoId,
  ].filter(Boolean) as string[];

  const docs = await db.document.findMany({
    where: { id: { in: docIds } },
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      verifiedAt: true,
      verifiedByUserId: true,
      verificationNotes: true,

      reviews: {
        select: {
          id: true,
          reviewedByUserId: true,
          reviewerName: true,
          reviewerRole: true,
          notes: true,
          isApproved: true,
          reviewedAt: true,
        },
        orderBy: {
          reviewedAt: "asc",
        },
      },
    },
  });

  const documents = {
    cac: docs.find((d) => d.id === park.cacDocumentId),
    land: docs.find((d) => d.id === park.landOwnershipDocId),
    asin: docs.find((d) => d.id === park.corporateAsinDocumentId),
    toilet: docs.find((d) => d.id === park.toiletPhotoId),
    waitingArea: docs.find((d) => d.id === park.waitingAreaPhotoId),
    signage: docs.find((d) => d.id === park.signagePhotoId),
    waterFacility: docs.find((d) => d.id === park.waterFacilityPhotoId),
  };

  return {
    success: true,
    data: {
      ...park,
      documents,
      locationAddress: `${park.streetAddress}, ${park.lga} LGA, ${park.townCity}`,
    } as unknown as MotorParkDetail,
  };
}

// ==================== INSPECTION SCHEDULING (FR-011, STORY-023) ====================

/**
 * FR-011: HOD Parks (or above) schedules an inspection.
 * Creates Inspection record and moves park status to INSPECTION_SCHEDULED.
 */
const MOTOR_PARK_MIN_TEAM = 2;
const MOTOR_PARK_MAX_TEAM = 4;

/**
 * HOD Operations schedules the inspection team — same pattern as mass
 * transit and revalidation: a lead plus 1-3 other officers, the date, and
 * where they meet. The visit goes straight to SCHEDULED; there is no longer
 * a separate "PS clears the schedule" step before the site visit happens.
 */
export async function scheduleParkInspection(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ inspectionId: string }>> {
  const authz = await authorize(["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"]);
  if (!authz.ok) return { success: false, error: authz.error };
  const session = authz.session;

  const parkId = formData.get("parkId") as string;
  const inspectionType = (formData.get("inspectionType") as string) || "INITIAL";
  const scheduledDateRaw = formData.get("scheduledDate") as string;
  const inspectorStationLocation =
    (formData.get("inspectorStationLocation") as string) || null;
  const leadId = formData.get("leadId") as string;
  const memberIdsRaw = formData.getAll("memberIds").map(String).filter(Boolean);

  if (!parkId) return { success: false, error: "Park ID required" };

  const scheduledDate = new Date(scheduledDateRaw);
  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return { success: false, error: "Choose an inspection date in the future." };
  }

  // The HOD always attends, whether or not they ticked their own name.
  const team = Array.from(new Set([...memberIdsRaw, session.userId])).filter(Boolean);

  if (team.length < MOTOR_PARK_MIN_TEAM) {
    return {
      success: false,
      error: `An inspection needs at least ${MOTOR_PARK_MIN_TEAM} officers - select at least one besides yourself.`,
    };
  }
  if (team.length > MOTOR_PARK_MAX_TEAM) {
    return {
      success: false,
      error: `An inspection team may hold at most ${MOTOR_PARK_MAX_TEAM} officers (you are counted automatically).`,
    };
  }
  if (!leadId || !team.includes(leadId)) {
    return {
      success: false,
      error: "The lead inspector must be one of the selected officers.",
    };
  }

  const found = await db.user.count({ where: { id: { in: team }, isActive: true } });
  if (found !== team.length) {
    return { success: false, error: "One or more selected officers are invalid." };
  }

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, applicationStatus: true, businessName: true },
  });
  if (!park) return { success: false, error: "Motor park not found" };

  const schedulableStatuses = ["SUBMITTED", "UNDER_REVIEW", "INSPECTION_COMPLETED"];
  if (!schedulableStatuses.includes(park.applicationStatus)) {
    return {
      success: false,
      error: `Cannot schedule inspection when status is ${park.applicationStatus}`,
    };
  }

  const inspection = await db.inspection.create({
    data: {
      inspectionType,
      linkedEntityType: "MOTOR_PARK",
      linkedEntityId: parkId,
      motorParkId: parkId,
      scheduledDate,
      scheduledByUserId: session.userId,
      assignedToUserId: leadId,
      inspectorStationLocation,
      status: "SCHEDULED",
      completedByUserId: leadId, // overwritten on completion
    },
    select: { id: true },
  });

  await db.$transaction([
    db.motorParkInspector.deleteMany({ where: { parkId } }),
    db.motorParkInspector.createMany({
      data: team.map((userId) => ({
        parkId,
        userId,
        isLead: userId === leadId,
      })),
    }),
    db.motorPark.update({
      where: { id: parkId },
      data: { applicationStatus: "INSPECTION_SCHEDULED" },
    }),
    db.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "INSPECTION_SCHEDULED",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: `${inspectionType} inspection scheduled for ${park.businessName} on ${scheduledDate.toDateString()} - ${team.length} officers, lead assigned`,
      },
    }),
  ]);

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");
  revalidatePath("/inspections");

  return { success: true, data: { inspectionId: inspection.id } };
}

/** A team member who is not the lead records what they saw. */
export async function commentOnMotorParkInspection(
  parkId: string,
  comment: string,
): Promise<ActionResult> {
  const session = await requireAuth();

  if (!comment?.trim()) {
    return { success: false, error: "Write what you saw before saving." };
  }

  const member = await db.motorParkInspector.findUnique({
    where: { parkId_userId: { parkId, userId: session.userId } },
  });
  if (!member) {
    return { success: false, error: "You are not on this inspection's team." };
  }

  await db.motorParkInspector.update({
    where: { id: member.id },
    data: { comment: comment.trim(), commentedAt: new Date() },
  });

  revalidatePath(`/motor-parks/${parkId}`);
  return { success: true };
}

// ==================== INSPECTION EXECUTION (FR-012, STORY-024) ====================

/**
 * The lead inspector files the report. Only the lead does this — the others
 * comment (see commentOnMotorParkInspection). Matches mass transit and
 * revalidation's own inspection report exactly: a declared-vs-found
 * checklist (Sections A-D, F, G), findings, and required site evidence —
 * this replaces the old scored AN/MOT/40/29 checklist entirely.
 */
export interface ProximityEvaluationInput {
  nearPublicPark: boolean;
  publicParkDistanceM?: number | null;
  nearMajorRoad: boolean;
  majorRoadDistanceM?: number | null;
  nearIntersection: boolean;
  intersectionDistanceM?: number | null;
  verdict: "PASS" | "CONDITIONAL" | "FAIL";
  notes?: string | null;
}

export async function submitInspectionReport(
  parkId: string,
  input: {
    findings: string;
    checklist?: unknown;
    evidenceUrls?: unknown;
    proximity?: ProximityEvaluationInput;
  },
): Promise<ActionResult> {
  const session = await requireAuth();

  if (!input.findings?.trim()) {
    return { success: false, error: "Record what was found at the site." };
  }
  if (!Array.isArray(input.evidenceUrls) || input.evidenceUrls.length === 0) {
    return {
      success: false,
      error: "Upload at least one piece of site evidence before filing.",
    };
  }

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: {
      applicationStatus: true,
      businessName: true,
      inspectorTeam: { select: { userId: true, isLead: true } },
    },
  });
  if (!park) return { success: false, error: "Motor park not found." };

  const isLead = park.inspectorTeam.some(
    (m) => m.userId === session.userId && m.isLead,
  );
  if (!isLead && session.role !== "SYSTEM_ADMIN") {
    return {
      success: false,
      error:
        "Only the lead inspector files the report. If you attended, leave a comment instead.",
    };
  }

  if (park.applicationStatus !== "INSPECTION_SCHEDULED") {
    return {
      success: false,
      error: `No inspection is outstanding for this park (currently ${park.applicationStatus}).`,
    };
  }

  const inspection = await db.inspection.findFirst({
    where: { linkedEntityType: "MOTOR_PARK", linkedEntityId: parkId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const now = new Date();

  if (inspection) {
    await db.inspection.update({
      where: { id: inspection.id },
      data: {
        status: "COMPLETED",
        completedByUserId: session.userId,
        overallAssessment: input.findings.trim(),
        inspectionEndTime: now,
        ...(input.checklist ? { inspectionChecklist: input.checklist as never } : {}),
        ...(input.evidenceUrls ? { evidenceUrls: input.evidenceUrls as never } : {}),
      },
    });
  }

  // The report is filed; HOD Operations has not recommended yet, so this
  // goes to INSPECTION_COMPLETED, not straight to PENDING_HOD_APPROVAL. The
  // proximity verdict is recorded alongside it as a finding, not as its own
  // status change — a FAIL does not auto-reject, HOD Operations weighs it
  // like everything else on the report.
  const p = input.proximity;
  await db.motorPark.update({
    where: { id: parkId },
    data: {
      applicationStatus: "INSPECTION_COMPLETED",
      ...(p && {
        nearPublicPark: p.nearPublicPark,
        publicParkDistanceM: p.publicParkDistanceM ?? null,
        nearMajorRoad: p.nearMajorRoad,
        majorRoadDistanceM: p.majorRoadDistanceM ?? null,
        nearIntersection: p.nearIntersection,
        intersectionDistanceM: p.intersectionDistanceM ?? null,
        proximityVerdict: p.verdict,
        proximityNotes: p.notes?.trim() || null,
      }),
    },
  });

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "INSPECTION_REPORT_SUBMITTED",
      entityType: "MOTOR_PARK",
      entityId: parkId,
      changeDescription: `Inspection filed for ${park.businessName}`,
    },
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");

  return { success: true };
}

// ==================== WORKFLOW APPROVALS (HOD Ops -> HOD Reval -> PS -> COMMISSIONER) ====================

/**
 * HOD of Operations records a recommendation on the filed inspection report
 * and forwards to HOD Parks Revalidation. Matches mass transit and
 * revalidation's own chain — this used to go straight from the inspection to
 * a single HOD stage, with no written recommendation required.
 */
export async function hodOpsRecommendMotorPark(
  parkId: string,
  recommendation: string,
): Promise<ActionResult> {
  const authz = await authorize(["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!recommendation?.trim()) {
    return { success: false, error: "Write your recommendation before forwarding." };
  }

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, applicationStatus: true, businessName: true },
  });
  if (!park) return { success: false, error: "Motor park not found" };

  if (park.applicationStatus !== "INSPECTION_COMPLETED") {
    return {
      success: false,
      error: `The inspection report is not ready for your recommendation (currently ${park.applicationStatus}).`,
    };
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.motorPark.update({
      where: { id: parkId },
      data: {
        applicationStatus: "PENDING_HOD_APPROVAL",
        hodOpsRecommendation: recommendation.trim(),
        hodOpsApprovedAt: now,
        hodOpsApprovedByUserId: authz.session.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: authz.session.userId,
        action: "HOD_OPS_RECOMMENDED_MOTOR_PARK",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: `HOD Operations recommended ${park.businessName}; forwarded to HOD Parks Revalidation`,
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");
  return { success: true };
}

/**
 * HOD Parks Revalidation reviews HOD Operations' recommendation and signs
 * off to the Permanent Secretary.
 */
export async function hodApproveMotorPark(
  parkId: string,
): Promise<ActionResult> {
  await requireRole(["HOD_PARKS_REVALIDATION", "SYSTEM_ADMIN"]);
  const session = await requireAuth();

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, applicationStatus: true, businessName: true },
  });

  if (!park) return { success: false, error: "Motor park not found" };

  // INSPECTION_COMPLETED was accepted here too, which let an application
  // reach this desk without HOD Operations ever recommending it.
  if (park.applicationStatus !== "PENDING_HOD_APPROVAL") {
    return {
      success: false,
      error: `Cannot approve — current status is ${park.applicationStatus}.`,
    };
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.motorPark.update({
      where: { id: parkId },
      data: {
        applicationStatus: "PENDING_PS_APPROVAL",
        hodApprovedAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "HOD_APPROVED_MOTOR_PARK",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: `HOD Parks Revalidation reviewed and signed off application to Permanent Secretary for ${park.businessName}`,
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");
  return { success: true };
}

/**
 * Permanent Secretary reviews and approves application to Commissioner.
 */
export async function psApproveMotorPark(
  parkId: string,
  adjustedMonthlyLevy?: number,
  psRecommendationNotes?: string,
): Promise<ActionResult> {
  await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);
  const session = await requireAuth();

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, applicationStatus: true, businessName: true, monthlyLevyAmount: true },
  });

  if (!park) return { success: false, error: "Motor park not found" };

  // INSPECTION_COMPLETED was accepted here too, which let an application
  // reach the PS without either HOD having seen it.
  if (park.applicationStatus !== "PENDING_PS_APPROVAL") {
    return {
      success: false,
      error: `Cannot approve — current status is ${park.applicationStatus}.`,
    };
  }

  const now = new Date();
  const amountInKobo =
    adjustedMonthlyLevy !== undefined && adjustedMonthlyLevy >= 0
      ? Math.round(adjustedMonthlyLevy * 100)
      : park.monthlyLevyAmount;

  await db.$transaction(async (tx) => {
    await tx.motorPark.update({
      where: { id: parkId },
      data: {
        applicationStatus: "PENDING_COMMISSIONER_APPROVAL",
        psApprovedAt: now,
        monthlyLevyAmount: amountInKobo,
        psRecommendationNotes: psRecommendationNotes?.trim() || null,
      },
    });

    if (amountInKobo) {
      const existingFee = await tx.motorParkFee.findFirst({
        where: { motorParkId: parkId, feeType: "MONTHLY_LEVY" },
      });
      if (existingFee) {
        await tx.motorParkFee.update({
          where: { id: existingFee.id },
          data: { amount: amountInKobo },
        });
      } else {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        await tx.motorParkFee.create({
          data: {
            motorParkId: parkId,
            feeType: "MONTHLY_LEVY",
            amount: amountInKobo,
            dueDate: nextMonth,
            status: "PENDING",
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "PS_APPROVED_MOTOR_PARK",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: `Permanent Secretary submitted recommendation to Commissioner for ${park.businessName}${
          adjustedMonthlyLevy !== undefined
            ? ` with finalized monthly levy of ₦${adjustedMonthlyLevy.toLocaleString()}`
            : ""
        }${psRecommendationNotes ? `. Notes: ${psRecommendationNotes}` : ""}`,
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");
  return { success: true };
}

/**
 * Return the application with a reason, from whichever stage the caller
 * holds. There was no reject-with-reason action anywhere in this chain —
 * the only way an application became REJECTED was an inspection verdict of
 * FAIL, with no way for a HOD, the PS or the Commissioner to send it back.
 */
export async function rejectMotorPark(
  parkId: string,
  reason: string,
): Promise<ActionResult> {
  if (!reason?.trim()) {
    return { success: false, error: "A reason is required — the operator needs to know what to fix." };
  }

  const authz = await authorize([
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "PERMANENT_SECRETARY",
    "COMMISSIONER",
    "SYSTEM_ADMIN",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { applicationStatus: true, businessName: true },
  });
  if (!park) return { success: false, error: "Motor park not found" };

  const stageRole: Record<string, string> = {
    INSPECTION_COMPLETED: "HOD_TRANSPORT_OPS",
    PENDING_HOD_APPROVAL: "HOD_PARKS_REVALIDATION",
    PENDING_PS_APPROVAL: "PERMANENT_SECRETARY",
    PENDING_COMMISSIONER_APPROVAL: "COMMISSIONER",
  };
  const owner = stageRole[park.applicationStatus];
  if (!owner) {
    return {
      success: false,
      error: `This application cannot be rejected from ${park.applicationStatus}.`,
    };
  }
  if (authz.session.role !== "SYSTEM_ADMIN" && authz.session.role !== owner) {
    return { success: false, error: "This application is not at your stage." };
  }

  const text = reason.trim();
  await db.$transaction([
    db.motorPark.update({
      where: { id: parkId },
      data: {
        applicationStatus: "REJECTED",
        rejectionReason: text,
        hodOpsApprovedAt: null,
        hodApprovedAt: null,
        psApprovedAt: null,
      },
    }),
    db.auditLog.create({
      data: {
        performedByUserId: authz.session.userId,
        action: "MOTOR_PARK_REJECTED",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: `${authz.session.role} rejected ${park.businessName}: ${text}`,
      },
    }),
  ]);

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");
  return { success: true };
}

// ==================== PERMIT TO BUILD (FR-013, STORY-026) ====================

/**
 * FR-013: Commissioner issues "Permit to Build" after PS approval.
 * Moves application to APPROVED with permitToBuild metadata.
 */
export async function issuePermitToBuild(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ permitNumber: string }>> {
  await requireRole(["COMMISSIONER", "SYSTEM_ADMIN"]);
  const session = await requireAuth();

  const parkId = formData.get("parkId") as string;
  const approvalNotes = formData.get("approvalNotes") as string;

  if (!parkId) return { success: false, error: "Park ID required" };

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: {
      id: true,
      applicationStatus: true,
      businessName: true,
      anssidNumber: true,
    },
  });

  if (!park) return { success: false, error: "Motor park not found" };

  const allowedStatuses = ["PENDING_COMMISSIONER_APPROVAL"];
  if (!allowedStatuses.includes(park.applicationStatus)) {
    return {
      success: false,
      error: `Cannot issue Permit to Build — application is in status ${park.applicationStatus}. Permanent Secretary recommendation and approval must be completed first.`,
    };
  }

  // Generate permit number: MOT/PTB/{year}/{sequence}
  const year = new Date().getFullYear();
  const count = await db.motorPark.count({
    where: { permitNumber: { startsWith: `MOT/PTB/${year}/` } },
  });
  const permitNumber = `MOT/PTB/${year}/${String(count + 1).padStart(4, "0")}`;

  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.motorPark.update({
      where: { id: parkId },
      data: {
        applicationStatus: "APPROVED",
        permitStatus: "ACTIVE",
        permitNumber,
        permitIssuedAt: now,
        permitExpiresAt: sixMonthsFromNow,
        approvedAt: now,
        commissionerApprovedAt: now,
        approvedByUserId: session.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "PERMIT_TO_BUILD_ISSUED",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: approvalNotes
          ? `Permit to Build issued. Notes: ${approvalNotes}`
          : `Permit to Build issued. Permit: ${permitNumber}`,
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");

  return { success: true, data: { permitNumber } };
}

// ==================== RE-INSPECTION (FR-014, FR-015, STORY-027, STORY-028) ====================

/**
 * FR-014: Applicant notifies construction complete → triggers re-inspection request.
 * Moves application back to SUBMITTED status for re-inspection scheduling.
 */
export async function requestReInspection(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["EXTERNAL_APPLICANT"]);

  const parkId = formData.get("parkId") as string;
  const completionNotes = formData.get("completionNotes") as string;

  if (!parkId) return { success: false, error: "Park ID required" };

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, contactUserId: true, applicationStatus: true },
  });

  if (!park) return { success: false, error: "Motor park not found" };
  if (park.contactUserId !== session.userId)
    return { success: false, error: "Access denied" };

  // Can only request re-inspection once Permit to Build is issued (APPROVED status)
  if (park.applicationStatus !== "APPROVED") {
    return {
      success: false,
      error:
        "Re-inspection can only be requested after Permit to Build is issued",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.motorPark.update({
      where: { id: parkId },
      data: { applicationStatus: "SUBMITTED" }, // Reset for re-inspection scheduling by HOD
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "RE_INSPECTION_REQUESTED",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: completionNotes
          ? `Applicant notified construction complete. Notes: ${completionNotes}`
          : "Applicant notified construction complete — re-inspection requested",
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);

  return { success: true };
}

// ==================== FEE ASSESSMENT (FR-016, STORY-029) ====================

/**
 * FR-016: Finance Officer records Motor Park Fee/Levy assessment.
 */
export async function recordFeeAssessment(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ feeId: string }>> {
  await requireRole([
    "FINANCE_OFFICER",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "HOD_PARKS",
  ]);
  const session = await requireAuth();

  const raw = {
    motorParkId: formData.get("motorParkId") as string,
    feeType: formData.get("feeType"),
    amount: Number(formData.get("amount")),
    dueDate: formData.get("dueDate"),
  };

  const parsed = motorParkFeeRecordSchema.safeParse({
    feeType: raw.feeType,
    amount: raw.amount,
    dueDate: raw.dueDate,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  if (!raw.motorParkId)
    return { success: false, error: "Motor park ID required" };

  const fee = await db.motorParkFee.create({
    data: {
      motorParkId: raw.motorParkId,
      feeType: parsed.data.feeType,
      amount: parsed.data.amount,
      dueDate: parsed.data.dueDate,
      status: "PENDING",
    },
    select: { id: true },
  });

  // Update motor park's assessed fee amount if it's a new assessment
  if (parsed.data.feeType === "MONTHLY_LEVY") {
    await db.motorPark.update({
      where: { id: raw.motorParkId },
      data: { monthlyLevyAmount: parsed.data.amount },
    });
  } else if (parsed.data.feeType === "ANNUAL") {
    await db.motorPark.update({
      where: { id: raw.motorParkId },
      data: { assessedFeeAmount: parsed.data.amount },
    });
  }

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "FEE_ASSESSED",
      entityType: "MOTOR_PARK",
      entityId: raw.motorParkId,
      changeDescription: `${parsed.data.feeType} fee of ₦${(parsed.data.amount / 100).toLocaleString()} assessed. Due: ${parsed.data.dueDate.toDateString()}`,
    },
  });

  revalidatePath(`/motor-parks/${raw.motorParkId}`);

  return { success: true, data: { feeId: fee.id } };
}

// ==================== TEMPORAL APPROVAL ====================

export async function issueTemporalApproval(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ parkId: string }>> {
  // Commissioner only, and only once the full chain has run — this used to
  // accept INSPECTION_COMPLETED or PENDING_APPROVAL, and the PS, which meant
  // a temporal approval could be issued before HOD Operations, HOD Parks
  // Revalidation or the PS had ever seen the application.
  await requireRole(["COMMISSIONER"]);
  const session = await requireAuth();

  const parkId = formData.get("parkId") as string;
  const notes = formData.get("notes") as string;

  if (!parkId) return { success: false, error: "Park ID required" };

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, applicationStatus: true, businessName: true },
  });

  if (!park) return { success: false, error: "Motor park not found" };

  if (park.applicationStatus !== "PENDING_COMMISSIONER_APPROVAL") {
    return {
      success: false,
      error: `Cannot issue temporal approval — current status is ${park.applicationStatus}. HOD Operations, HOD Parks Revalidation and the Permanent Secretary must sign off first.`,
    };
  }

  // A temporal approval is a signed decision, so it is recorded as one. This
  // previously wrote the status alone, which left the signatures panel saying
  // "Pending Signature" on a park that had just been approved, and left the
  // permit with no expiry — so it never came up for revalidation either.
  const temporalMonths =
    (await getNumberSetting("motorpark.validity.temporalMonths")) || 6;
  const temporalNow = new Date();
  const temporalExpiry = new Date(temporalNow);
  temporalExpiry.setMonth(temporalExpiry.getMonth() + temporalMonths);

  await db.motorPark.update({
    where: { id: parkId },
    data: {
      applicationStatus: "TEMPORAL_APPROVAL",
      permitStatus: "ACTIVE",
      permitIssuedAt: temporalNow,
      permitExpiresAt: temporalExpiry,
      nextRevalidationDue: temporalExpiry,
      approvedAt: temporalNow,
      approvedByUserId: session.userId,
      // Whichever of the two issued it is the one who signed. A permit number
      // is deliberately NOT assigned here — that belongs to final approval.
      ...(session.role === "COMMISSIONER"
        ? { commissionerApprovedAt: temporalNow }
        : { psApprovedAt: temporalNow }),
    },
  });

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "TEMPORAL_APPROVAL_ISSUED",
      entityType: "MOTOR_PARK",
      entityId: parkId,
      changeDescription: `Temporal Approval issued for ${park.businessName}. Notes: ${notes || "None"}`,
    },
  });

  revalidatePath(`/motor-parks/${parkId}`);
  return { success: true, data: { parkId } };
}

// ==================== FINAL APPROVAL LETTER (FR-017, STORY-030) ====================

/**
 * FR-017: Commissioner/PS issues final approval letter after re-inspection passes.
 * Generates digital approval record with annual revalidation date.
 */
export async function issueFinalApproval(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ permitNumber: string; revalidationDue: Date }>> {
  await requireRole(["COMMISSIONER", "SYSTEM_ADMIN"]);
  const session = await requireAuth();

  const parkId = formData.get("parkId") as string;
  const approvalNotes = formData.get("approvalNotes") as string;

  if (!parkId) return { success: false, error: "Park ID required" };

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: {
      id: true,
      applicationStatus: true,
      businessName: true,
      permitNumber: true,
    },
  });

  if (!park) return { success: false, error: "Motor park not found" };

  const allowedStatuses = [
    "PENDING_COMMISSIONER_APPROVAL",
    "TEMPORAL_APPROVAL",
  ];
  if (!allowedStatuses.includes(park.applicationStatus)) {
    return {
      success: false,
      error:
        "Final approval requires Permanent Secretary recommendation or temporal approval prior to Commissioner sign-off.",
    };
  }

  const now = new Date();
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // Reuse permit number if already assigned (from Permit to Build), else generate new
  let permitNumber = park.permitNumber;
  if (!permitNumber) {
    const year = now.getFullYear();
    const count = await db.motorPark.count({
      where: { permitNumber: { startsWith: `MOT/APP/${year}/` } },
    });
    permitNumber = `MOT/APP/${year}/${String(count + 1).padStart(4, "0")}`;
  }

  await db.$transaction(async (tx) => {
    await tx.motorPark.update({
      where: { id: parkId },
      data: {
        applicationStatus: "APPROVED",
        permitStatus: "ACTIVE",
        permitNumber,
        permitIssuedAt: now,
        permitExpiresAt: oneYearFromNow,
        lastRevalidatedAt: now,
        nextRevalidationDue: oneYearFromNow,
        approvedAt: now,
        commissionerApprovedAt: now,
        approvedByUserId: session.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "FINAL_APPROVAL_LETTER_ISSUED",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: approvalNotes
          ? `Final approval issued. Next revalidation: ${oneYearFromNow.toDateString()}. Notes: ${approvalNotes}`
          : `Final approval issued. Permit: ${permitNumber}. Next revalidation: ${oneYearFromNow.toDateString()}`,
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");

  return {
    success: true,
    data: { permitNumber: permitNumber!, revalidationDue: oneYearFromNow },
  };
}

// ==================== REVOCATION (FR-019, STORY-032) ====================

/**
 * FR-019: Commissioner/PS revokes a motor park permit.
 * Sets application status to REVOKED, permit status to REVOKED.
 */
export async function revokeParkPermit(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireExecutive();
  const session = await requireAuth();

  const parkId = formData.get("parkId") as string;
  const revocationReason = formData.get("revocationReason") as string;

  if (!parkId) return { success: false, error: "Park ID required" };
  if (!revocationReason || revocationReason.trim().length < 10) {
    return {
      success: false,
      error: "Revocation reason must be at least 10 characters",
    };
  }

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, applicationStatus: true, permitStatus: true },
  });

  if (!park) return { success: false, error: "Motor park not found" };
  if (park.permitStatus !== "ACTIVE") {
    return { success: false, error: "Only ACTIVE permits can be revoked" };
  }

  await db.$transaction(async (tx) => {
    await tx.motorPark.update({
      where: { id: parkId },
      data: {
        applicationStatus: "REVOKED",
        permitStatus: "REVOKED",
        revokedAt: new Date(),
        revocationReason: revocationReason.trim(),
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "PERMIT_REVOKED",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: `Permit revoked. Reason: ${revocationReason.trim()}`,
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath("/motor-parks");

  return { success: true };
}

// ==================== REVALIDATION (FR-018, STORY-031) ====================

/**
 * FR-018: Initiate annual revalidation.
 * Resets revalidation state, sends reminders.
 */
export async function initiateRevalidation(
  parkId: string,
): Promise<ActionResult> {
  const session = await requireRole([
    "HOD_PARKS",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
  ]);

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, permitStatus: true, nextRevalidationDue: true },
  });

  if (!park) return { success: false, error: "Motor park not found" };
  if (park.permitStatus !== "ACTIVE") {
    return { success: false, error: "Only ACTIVE permits can be revalidated" };
  }

  await db.$transaction(async (tx) => {
    // Reset status for re-inspection workflow
    await tx.motorPark.update({
      where: { id: parkId },
      data: { applicationStatus: "SUBMITTED" },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "REVALIDATION_INITIATED",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        changeDescription: `Annual revalidation initiated. Previous due: ${park.nextRevalidationDue?.toDateString()}`,
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);

  return { success: true };
}

// ==================== DASHBOARD STATS (STORY-033) ====================

export type ParkStatusSummary = {
  total: number;
  submitted: number;
  underReview: number;
  inspectionScheduled: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  revoked: number;
  expiringSoon: number; // permits expiring within 60 days
  pendingPayments: number; // applications with unpaid fees
};

/**
 * STORY-033: Motor park status dashboard stats.
 * External applicants see their own stats only.
 */
export async function getParkStatusSummary(): Promise<
  ActionResult<ParkStatusSummary>
> {
  const session = await requireAuth();

  const userId =
    session.role === "EXTERNAL_APPLICANT" ? session.userId : undefined;

  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

  const [statusCounts, expiringSoon, pendingPayments] = await Promise.all([
    db.motorPark.groupBy({
      by: ["applicationStatus"],
      where: userId ? { contactUserId: userId } : {},
      _count: { _all: true },
    }),
    db.motorPark.count({
      where: {
        ...(userId ? { contactUserId: userId } : {}),
        permitStatus: "ACTIVE",
        permitExpiresAt: { lte: sixtyDaysFromNow, gte: new Date() },
      },
    }),
    db.motorPark.count({
      where: {
        ...(userId ? { contactUserId: userId } : {}),
        fees: {
          some: {
            status: "PENDING",
          },
        },
      },
    }),
  ]);

  const counts = Object.fromEntries(
    statusCounts.map((s) => [s.applicationStatus, s._count._all]),
  );

  const total = statusCounts.reduce((sum, s) => sum + s._count._all, 0);

  return {
    success: true,
    data: {
      total,
      submitted: counts.SUBMITTED ?? 0,
      underReview: counts.UNDER_REVIEW ?? 0,
      inspectionScheduled:
        (counts.INSPECTION_SCHEDULED ?? 0) +
        (counts.INSPECTION_IN_PROGRESS ?? 0),
      pendingApproval: counts.PENDING_APPROVAL ?? 0,
      approved: counts.APPROVED ?? 0,
      rejected: counts.REJECTED ?? 0,
      revoked: counts.REVOKED ?? 0,
      expiringSoon,
      pendingPayments,
    },
  };
}

// ==================== CHECKLIST TEMPLATES ====================

/**
 * Fetch inspection checklist template for motor parks (FR-012).
 * Returns the active MOTOR_PARK template with all required items.
 */
export async function getMotorParkChecklistTemplate(): Promise<
  ActionResult<{
    id: string;
    name: string;
    items: {
      id: string;
      itemName: string;
      itemCategory: string;
      description: string | null;
      isRequired: boolean;
      maxPoints: number;
    }[];
  }>
> {
  await requireAuth();

  const template = await db.inspectionChecklistTemplate.findFirst({
    where: { linkedEntityType: "MOTOR_PARK", isActive: true },
    select: {
      id: true,
      name: true,
      items: {
        select: {
          id: true,
          itemName: true,
          itemCategory: true,
          description: true,
          isRequired: true,
          maxPoints: true,
        },
        orderBy: [{ itemCategory: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  if (!template) {
    return { success: false, error: "No active inspection checklist found" };
  }

  return { success: true, data: template };
}

export async function getInspection(inspectionId: string): Promise<
  ActionResult<{
    id: string;
    inspectionType: string;
    status: string;
    overallAssessment: string | null;
    recommendedAction: string | null;
    assignedToUserId: string;
    checklist: Array<{
      checklistItemId: string;
      isCompliant: boolean;
      notes: string | null;
      photoUrls: string | null;
      score: number | null;
    }>;
    assignedTo: {
      hasEntranceExitAccess: boolean;
      hasGatehouseAccess: boolean;
    };
  }>
> {
  const session = await requireAuth();

  const inspection = await db.inspection.findUnique({
    where: { id: inspectionId },
    select: {
      id: true,
      inspectionType: true,
      status: true,
      overallAssessment: true,
      recommendedAction: true,
      assignedToUserId: true,
      checklist: {
        select: {
          checklistItemId: true,
          isCompliant: true,
          notes: true,
          photoUrls: true,
          score: true,
        },
      },
      assignedTo: {
        select: {
          hasEntranceExitAccess: true,
          hasGatehouseAccess: true,
        },
      },
    },
  });

  if (!inspection) {
    return { success: false, error: "Inspection not found" };
  }

  return { success: true, data: inspection };
}

export async function saveInspectionDraft(
  inspectionId: string,
  checklistItems: Array<{
    checklistItemId: string;
    isCompliant: boolean;
    notes?: string;
    photoUrls?: string;
    score?: number;
  }>,
  overallAssessment?: string,
  recommendedAction?: string,
): Promise<ActionResult> {
  const session = await requireAuth();

  if (!canPerformInspections(session.role)) {
    return {
      success: false,
      error: "Only field inspectors can perform inspections",
    };
  }

  const now = new Date();

  try {
    await db.$transaction(async (tx) => {
      // Clean existing draft items for this inspection
      await tx.inspectionChecklistResult.deleteMany({
        where: { inspectionId },
      });

      // Write current draft items
      if (checklistItems.length > 0) {
        await tx.inspectionChecklistResult.createMany({
          data: checklistItems.map((item) => ({
            inspectionId,
            checklistItemId: item.checklistItemId,
            isCompliant: item.isCompliant,
            notes: item.notes || null,
            photoUrls: item.photoUrls || null,
            score: item.score !== undefined ? item.score : null,
            recordedAt: now,
            recordedByUserId: session.userId,
          })),
        });
      }

      // Update narrative draft fields
      await tx.inspection.update({
        where: { id: inspectionId },
        data: {
          overallAssessment: overallAssessment || null,
          recommendedAction: recommendedAction || null,
        },
      });
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save draft.",
    };
  }
}

export async function verifyDocument(
  documentId: string,
  isApproved: boolean,
  notes: string,
): Promise<ActionResult> {
  const session = await requireAuth();

  const allowedRoles = [
    "HOD_PARKS",
    "HOD_PARKS_REVALIDATION",
    "HOD_VIS",
    "HOD_TRANSPORT_OPS",
    "SYSTEM_ADMIN",
    // Deliberately NOT ADMIN — an Administrator has oversight of records but
    // does not sign off documents. Approval stays with the named offices.
  ];

  if (!allowedRoles.includes(session.role)) {
    return {
      success: false,
      error: "Only HOD or Admin can review and approve documents.",
    };
  }

  if (!documentId) return { success: false, error: "Document ID is required." };

  // Fetch reviewer's name for the snapshot
  const reviewer = await db.user.findUnique({
    where: { id: session.userId },
    select: { firstName: true, lastName: true, role: true },
  });

  const reviewerName = reviewer
    ? `${reviewer.firstName} ${reviewer.lastName}`
    : session.userId;
  const reviewerRole = reviewer?.role ?? session.role;

  try {
    await db.$transaction(async (tx) => {
      // Upsert the per-reviewer record — never overwrites a different reviewer's comment
      await tx.documentReview.upsert({
        where: {
          documentId_reviewedByUserId: {
            documentId,
            reviewedByUserId: session.userId,
          },
        },
        create: {
          documentId,
          reviewedByUserId: session.userId,
          reviewerRole,
          reviewerName,
          isApproved,
          notes: notes || null,
          reviewedAt: new Date(),
        },
        update: {
          isApproved,
          notes: notes || null,
          reviewerRole,
          reviewerName,
          reviewedAt: new Date(),
        },
      });

      // Keep the Document-level fields updated to reflect the latest reviewer's decision
      // (used for quick status checks / the green "Reviewed & Verified" banner)
      await tx.document.update({
        where: { id: documentId },
        data: {
          verifiedAt: isApproved ? new Date() : null,
          verifiedByUserId: session.userId,
          verificationNotes: notes || null,
        },
      });
    });

    // Audit log
    await db.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "DOCUMENT_REVIEWED",
        entityType: "Document",
        entityId: documentId,
        changeDescription: `Document ${documentId} reviewed by ${reviewerName} (${reviewerRole}). Status: ${isApproved ? "APPROVED" : "REJECTED"}. Notes: ${notes || "None"}`,
      },
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to verify document.",
    };
  }
}

// ==================== FIELD INSPECTOR ASSIGNMENTS ====================

// ==================== DOCUMENT UPLOAD (FR-010, STORY-022) ====================

/**
 * FR-010: Applicant uploads CAC certificate and land ownership/lease document
 * after submitting the initial application.
 * Stores document URL references in cacDocumentId / landOwnershipDocId fields.
 *
 * Access: EXTERNAL_APPLICANT (own parks only), plus the officers who correct
 * records on the operator's behalf — a field capture arrives with no
 * documents at all, and somebody at the Ministry has to attach them.
 */
export async function updateParkDocuments(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole([
    "EXTERNAL_APPLICANT",
    "HOD_PARKS",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "SYSTEM_ADMIN",
    "ADMIN",
  ]);

  const parkId = formData.get("parkId") as string;
  const cacDocumentFile = formData.get("cacDocument");
  const landOwnershipDocFile = formData.get("landOwnershipDoc");

  if (!parkId) return { success: false, error: "Park ID required" };
  if (
    !(cacDocumentFile instanceof File) &&
    !(landOwnershipDocFile instanceof File)
  ) {
    return {
      success: false,
      error: "At least one document upload is required.",
    };
  }

  // An applicant may only touch their own park. Ministry officers act on any
  // park, which is the point — a captured record has no owner to act on it.
  const isOwnerScoped = session.role === "EXTERNAL_APPLICANT";
  const park = await db.motorPark.findFirst({
    where: {
      id: parkId,
      ...(isOwnerScoped ? { contactUserId: session.userId } : {}),
    },
    select: { id: true },
  });
  if (!park)
    return { success: false, error: "Motor park not found or access denied" };

  const data: Record<string, string> = {};
  const uploadDetails: Array<{
    file: File;
    targetField: "cacDocumentId" | "landOwnershipDocId";
  }> = [];

  if (cacDocumentFile instanceof File && cacDocumentFile.size > 0) {
    uploadDetails.push({ file: cacDocumentFile, targetField: "cacDocumentId" });
  }

  if (landOwnershipDocFile instanceof File && landOwnershipDocFile.size > 0) {
    uploadDetails.push({
      file: landOwnershipDocFile,
      targetField: "landOwnershipDocId",
    });
  }

  for (const item of uploadDetails) {
    let uploaded;
    try {
      uploaded = await uploadDocument(
        item.file,
        item.targetField === "cacDocumentId" ? "cac" : "land",
      );
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Upload failed.",
      };
    }

    const document = await db.document.create({
      data: {
        uploadedByUserId: session.userId,
        fileName: uploaded.fileName,
        fileType: uploaded.fileMimeType.split("/")[1] ?? "bin",
        fileSize: uploaded.fileSize,
        fileUrl: uploaded.url,
        fileMimeType: uploaded.fileMimeType,
        linkedToType: "MOTOR_PARK",
        linkedToId: parkId,
      },
      select: { id: true },
    });

    data[item.targetField] = document.id;
  }

  await db.motorPark.update({ where: { id: parkId }, data });

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "DOCUMENTS_UPLOADED",
      entityType: "MOTOR_PARK",
      entityId: parkId,
      changeDescription: `Documents updated. CAC: ${uploadDetails.some((item) => item.targetField === "cacDocumentId") ? "uploaded" : "unchanged"}. Land: ${uploadDetails.some((item) => item.targetField === "landOwnershipDocId") ? "uploaded" : "unchanged"}.`,
    },
  });

  revalidatePath(`/motor-parks/${parkId}`);
  return { success: true };
}

// ==================== PROXIMITY EVALUATION (FR-015, STORY-028) ====================

/**
 * FR-015: Field inspector records proximity evaluation during re-inspection.
 * Evaluates: proximity to public park, major transport route, road intersections.
 * If verdict is PASS or CONDITIONAL → advances applicationStatus to PENDING_APPROVAL.
 *
 * Access: FIELD_INSPECTOR, HOD_PARKS, HOD_VIS, HOD_TRANSPORT_OPS, HOD_PARKS_REVALIDATION
 */
export async function recordProximityEvaluation(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole([
    "FIELD_INSPECTOR",
    "HOD_PARKS",
    "HOD_VIS",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
  ]);

  const parkId = formData.get("parkId") as string;
  const nearPublicPark = formData.get("nearPublicPark") === "yes";
  const publicParkDistance = formData.get("publicParkDistanceM") as string;
  const nearMajorRoad = formData.get("nearMajorRoad") === "yes";
  const majorRoadDistance = formData.get("majorRoadDistanceM") as string;
  const nearIntersection = formData.get("nearIntersection") === "yes";
  const intersectionDistance = formData.get("intersectionDistanceM") as string;
  const verdict = formData.get("proximityVerdict") as string;
  const proximityNotes = formData.get("proximityNotes") as string;

  if (!parkId) return { success: false, error: "Park ID required" };
  if (!["PASS", "CONDITIONAL", "FAIL"].includes(verdict)) {
    return { success: false, error: "Invalid proximity verdict" };
  }

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, applicationStatus: true },
  });
  if (!park) return { success: false, error: "Motor park not found" };

  const evaluationSummary = JSON.stringify({
    nearPublicPark,
    publicParkDistanceM: publicParkDistance || null,
    nearMajorRoad,
    majorRoadDistanceM: majorRoadDistance || null,
    nearIntersection,
    intersectionDistanceM: intersectionDistance || null,
    verdict,
    notes: proximityNotes || null,
    evaluatedAt: new Date().toISOString(),
    evaluatedByUserId: session.userId,
  });

  // Advance workflow: PASS/CONDITIONAL → PENDING_APPROVAL; FAIL → REJECTED
  const newStatus = verdict === "FAIL" ? "REJECTED" : "PENDING_APPROVAL";

  await db.$transaction(async (tx) => {
    await tx.motorPark.update({
      where: { id: parkId },
      data: {
        applicationStatus: newStatus as Parameters<
          typeof tx.motorPark.update
        >[0]["data"]["applicationStatus"],
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "PROXIMITY_EVALUATION_RECORDED",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        newValues: evaluationSummary,
        changeDescription: `Proximity evaluation: ${verdict}. Near public park: ${nearPublicPark}. Near major road: ${nearMajorRoad}. Near intersection: ${nearIntersection}. Status → ${newStatus}.`,
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);
  return { success: true };
}

// ==================== REVALIDATION TRIGGER (FR-018, STORY-031) ====================

/**
 * FR-018: FormData wrapper around initiateRevalidation for use with useActionState.
 * HOD Parks / Commissioner triggers annual revalidation cycle for an active permit.
 *
 * Access: HOD_PARKS, COMMISSIONER, PERMANENT_SECRETARY
 */
export async function triggerRevalidation(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parkId = formData.get("parkId") as string;
  if (!parkId) return { success: false, error: "Park ID required" };
  return initiateRevalidation(parkId);
}

// ==================== FIELD INSPECTORS (scheduling helper) ====================

/**
 * Get all field inspectors (for assignment dropdown in scheduling).
 * Available to HOD roles and above.
 */
/**
 * Who may be put on a motor park inspection team. The same pool mass
 * transit draws from, so HOD Operations sees one list of officers rather
 * than a shorter one here and a longer one there. The signed-in HOD is
 * excluded: they attend automatically and listing them only invites someone
 * to spend one of three seats on a person already in the room.
 */
export async function getMotorParkTeamCandidates() {
  const authz = await authorize(["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"]);
  if (!authz.ok) return { success: false as const, error: authz.error };

  const officers = await db.user.findMany({
    where: {
      isActive: true,
      id: { not: authz.session.userId },
      role: {
        in: [
          "FIELD_INSPECTOR",
          "VEHICLE_INSPECTION_OFFICER",
          "HOD_VIS",
          "HOD_TRANSPORT_OPS",
          "HOD_PARKS",
          "HOD_PARKS_REVALIDATION",
          "PARK_MONITOR",
        ],
      },
    },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { firstName: "asc" },
  });

  return { success: true as const, data: officers };
}

export async function getFieldInspectors(): Promise<
  ActionResult<
    {
      id: string;
      firstName: string;
      lastName: string;
      stationLocation: string | null;
    }[]
  >
> {
  await requireAuth();

  const inspectors = await db.user.findMany({
    where: { role: "FIELD_INSPECTOR", isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      stationLocation: true,
    },
    orderBy: { firstName: "asc" },
  });

  return { success: true, data: inspectors };
}

// ==================== ADMIN EDIT MOTOR PARK ====================

/**
 * Update a motor park application's details (Address, business particulars, contact info).
 * Available to Admins, HODs, and Executives.
 */
export async function updateMotorParkApplication(
  parkId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole([
    "ADMIN",
    "SYSTEM_ADMIN",
    "HOD_PARKS",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "ENUMERATOR",
  ]);

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
  });
  if (!park) return { success: false, error: "Motor park not found" };

  const businessName = formData.get("businessName") as string;
  const facilityType = formData.get("facilityType") as string;
  const transportCompanyName = formData.get("transportCompanyName") as string;
  const streetAddress = formData.get("streetAddress") as string;
  const townCity = formData.get("townCity") as string;
  const lga = formData.get("lga") as string;
  const gpsCoordinates = formData.get("gpsCoordinates") as string;
  const cacRegistrationNumber = formData.get("cacRegistrationNumber") as string;
  const anssidNumber = formData.get("anssidNumber") as string;
  const parkIdCustom = formData.get("parkId") as string;
  const contactPerson = formData.get("contactPerson") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const managerResidentialAddress = formData.get("managerResidentialAddress") as string;
  const nextOfKinName = formData.get("nextOfKinName") as string;
  const nextOfKinPhone = formData.get("nextOfKinPhone") as string;

  // Workflow / Financial overrides
  const applicationStatus = formData.get("applicationStatus") as string;
  const permitStatus = formData.get("permitStatus") as string;
  const permitNumber = formData.get("permitNumber") as string;
  const psRecommendationNotes = formData.get("psRecommendationNotes") as string;

  const monthlyLevyNairaRaw = formData.get("monthlyLevyAmount") as string;
  const assessedFeeNairaRaw = formData.get("assessedFeeAmount") as string;

  const monthlyLevyAmount = monthlyLevyNairaRaw
    ? Math.round(parseFloat(monthlyLevyNairaRaw) * 100)
    : park.monthlyLevyAmount;

  const assessedFeeAmount = assessedFeeNairaRaw
    ? Math.round(parseFloat(assessedFeeNairaRaw) * 100)
    : park.assessedFeeAmount;

  if (!businessName?.trim()) return { success: false, error: "Business / Park name is required" };
  if (!streetAddress?.trim()) return { success: false, error: "Street address is required" };
  if (!townCity?.trim()) return { success: false, error: "Town / City is required" };
  if (!lga?.trim()) return { success: false, error: "LGA is required" };
  if (!anssidNumber?.trim()) return { success: false, error: "ANSSID number is required" };
  if (!contactPerson?.trim()) return { success: false, error: "Contact person is required" };
  if (!contactPhone?.trim()) return { success: false, error: "Contact phone is required" };

  // Check unique constraints if anssidNumber is changed
  if (anssidNumber.trim() !== park.anssidNumber) {
    const existing = await db.motorPark.findUnique({
      where: { anssidNumber: anssidNumber.trim() },
    });
    if (existing && existing.id !== parkId) {
      return { success: false, error: "ANSSID number is already used by another park." };
    }
  }

  // Check unique constraints if parkId is changed
  if (parkIdCustom?.trim() && parkIdCustom.trim() !== park.parkId) {
    const existingParkId = await db.motorPark.findUnique({
      where: { parkId: parkIdCustom.trim() },
    });
    if (existingParkId && existingParkId.id !== parkId) {
      return { success: false, error: "Park ID is already assigned to another park." };
    }
  }

  // Check unique constraints if permitNumber is changed
  if (permitNumber?.trim() && permitNumber.trim() !== park.permitNumber) {
    const existingPermit = await db.motorPark.findUnique({
      where: { permitNumber: permitNumber.trim() },
    });
    if (existingPermit && existingPermit.id !== parkId) {
      return { success: false, error: "Permit number is already assigned to another park." };
    }
  }

  await db.$transaction(async (tx) => {
    const res = await tx.motorPark.update({
      where: { id: parkId },
      data: {
        businessName: businessName.trim(),
        facilityType: facilityType?.trim() || null,
        transportCompanyName: transportCompanyName?.trim() || null,
        streetAddress: streetAddress.trim(),
        townCity: townCity.trim(),
        lga: lga.trim(),
        gpsCoordinates: gpsCoordinates?.trim() || null,
        cacRegistrationNumber: cacRegistrationNumber?.trim() || null,
        anssidNumber: anssidNumber.trim(),
        parkId: parkIdCustom?.trim() || park.parkId,
        contactPerson: contactPerson.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail?.trim() || park.contactEmail,
        managerResidentialAddress: managerResidentialAddress?.trim() || null,
        nextOfKinName: nextOfKinName?.trim() || null,
        nextOfKinPhone: nextOfKinPhone?.trim() || null,
        applicationStatus: (applicationStatus?.trim() as any) || park.applicationStatus,
        permitStatus: (permitStatus?.trim() as any) || park.permitStatus,
        permitNumber: permitNumber?.trim() || park.permitNumber,
        psRecommendationNotes: psRecommendationNotes?.trim() || park.psRecommendationNotes,
        monthlyLevyAmount:
          typeof monthlyLevyAmount === "number" && !isNaN(monthlyLevyAmount)
            ? monthlyLevyAmount
            : null,
        assessedFeeAmount:
          typeof assessedFeeAmount === "number" && !isNaN(assessedFeeAmount)
            ? assessedFeeAmount
            : null,
      },
    });

    // Synchronize to any linked RevalidationApplication
    const linkedRevalidation = await tx.revalidationApplication.findFirst({
      where: { motorParkId: parkId },
    });
    if (linkedRevalidation) {
      await tx.revalidationApplication.update({
        where: { id: linkedRevalidation.id },
        data: {
          parkName: businessName.trim(),
          physicalLocation: streetAddress.trim(),
          townCommunity: townCity.trim(),
          lga: lga.trim(),
          representativeName: contactPerson.trim(),
          phoneNumber: contactPhone.trim(),
          emailAddress: contactEmail?.trim() || linkedRevalidation.emailAddress,
          residentialAddress:
            managerResidentialAddress?.trim() || linkedRevalidation.residentialAddress,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "MOTOR_PARK_UPDATED_BY_ADMIN",
        entityType: "MOTOR_PARK",
        entityId: parkId,
        oldValues: JSON.stringify({
          businessName: park.businessName,
          streetAddress: park.streetAddress,
          townCity: park.townCity,
          lga: park.lga,
          contactPerson: park.contactPerson,
          contactPhone: park.contactPhone,
          applicationStatus: park.applicationStatus,
          permitNumber: park.permitNumber,
        }),
        newValues: JSON.stringify({
          businessName: res.businessName,
          streetAddress: res.streetAddress,
          townCity: res.townCity,
          lga: res.lga,
          contactPerson: res.contactPerson,
          contactPhone: res.contactPhone,
          applicationStatus: res.applicationStatus,
          permitNumber: res.permitNumber,
        }),
        changeDescription: `Application details updated by ${session.role}.`,
      },
    });
  });

  revalidatePath(`/motor-parks/${parkId}`);
  revalidatePath(`/motor-parks/${parkId}/approval-letter`);
  revalidatePath(`/motor-parks/${parkId}/park-certificate`);
  revalidatePath(`/motor-parks/${parkId}/temporal-certificate`);
  revalidatePath(`/motor-parks/${parkId}/edit`);
  revalidatePath(`/motor-parks`);
  revalidatePath(`/letter-approvals`);

  const linkedRev = await db.revalidationApplication.findFirst({
    where: { motorParkId: parkId },
    select: { id: true },
  });
  if (linkedRev) {
    revalidatePath(`/admin/revalidation-queue/${linkedRev.id}`);
    revalidatePath(`/admin/revalidation-queue/${linkedRev.id}/certificate`);
    revalidatePath(`/admin/revalidation-queue/${linkedRev.id}/park-certificate`);
    revalidatePath(`/revalidation/${linkedRev.id}/certificate`);
    revalidatePath(`/revalidation/${linkedRev.id}/park-certificate`);
    revalidatePath(`/admin/revalidation-queue`);
  }

  return { success: true };
}

