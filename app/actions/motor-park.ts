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
import { SCHEDULE_ROLES } from "@/lib/workflow-roles";
import { sendInspectionApprovalNotification } from "@/lib/email";
import {
  requireAuth,
  requireRole,
  requireExecutive,
  canScheduleInspections,
  canPerformInspections,
  canIssuePermits,
} from "@/lib/auth";
import { uploadDocument } from "@/lib/spaces";
import {
  motorParkApplicationSchema,
  motorParkFieldCaptureSchema,
  motorParkStatusUpdateSchema,
  motorParkFeeRecordSchema,
  inspectionScheduleSchema,
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
    transportCompanyName: getCleanString(formData.get("transportCompanyName")),
    streetAddress: getCleanString(formData.get("streetAddress"), true),
    lga: getCleanString(formData.get("lga"), true),
    townCity: getCleanString(formData.get("townCity"), true),
    gpsCoordinates: getCleanString(formData.get("gpsCoordinates")),
    cacRegistrationNumber: getCleanString(
      formData.get("cacRegistrationNumber"),
    ),
    anssidNumber: getCleanString(formData.get("anssidNumber"), true),
    contactPerson: getCleanString(formData.get("contactPerson"), true),
    contactPhone: getCleanString(formData.get("contactPhone"), true),
    contactEmail: getCleanString(formData.get("contactEmail"), true),
    managerResidentialAddress: getCleanString(
      formData.get("managerResidentialAddress"),
    ),
    nextOfKinName: getCleanString(formData.get("nextOfKinName")),
    nextOfKinPhone: getCleanString(formData.get("nextOfKinPhone")),
    landOwnershipDocId: getCleanString(
      formData.get("landOwnershipDocId"),
      true,
    ),
    cacDocumentId: getCleanString(formData.get("cacDocumentId"), true),
    corporateAsinDocumentId: getCleanString(
      formData.get("corporateAsinDocumentId"),
    ),
    toiletPhotoId: getCleanString(formData.get("toiletPhotoId"), true),
    waitingAreaPhotoId: getCleanString(
      formData.get("waitingAreaPhotoId"),
      true,
    ),
    signagePhotoId: getCleanString(formData.get("signagePhotoId"), true),
    waterFacilityPhotoId: getCleanString(
      formData.get("waterFacilityPhotoId"),
      true,
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
      applicationStatus: isFieldCapture ? "DRAFT" : "SUBMITTED",
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

  if (filters?.status && filters.status !== "ALL") {
    where.applicationStatus = filters.status;
  }

  if (filters?.search) {
    where.OR = [
      { businessName: { contains: filters.search, mode: "insensitive" } },
      {
        transportCompanyName: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        cacRegistrationNumber: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
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
  applicant: { id: string; firstName: string; lastName: string; email: string };
  inspections: {
    id: string;
    inspectionType: string;
    status: string;
    scheduledDate: Date;
    assignedTo: { firstName: string; lastName: string };
    completedAt: Date | null;
    overallAssessment: string | null;
    recommendedAction: string | null;
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
      applicant: {
        select: { id: true, firstName: true, lastName: true, email: true },
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

  // RLS: external applicants can only view their own park
  if (
    session.role === "EXTERNAL_APPLICANT" &&
    park.applicant?.id !== session.userId
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
export async function scheduleParkInspection(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ inspectionId: string }>> {
  // Only the HOD of Operations schedules inspections. This previously
  // accepted any authenticated caller.
  const session = await requireRole([...SCHEDULE_ROLES]);

  if (!canScheduleInspections(session.role)) {
    return {
      success: false,
      error: "Insufficient permissions to schedule inspections",
    };
  }

  const raw = {
    linkedEntityType: "MOTOR_PARK",
    linkedEntityId: formData.get("parkId"),
    inspectionType: formData.get("inspectionType") ?? "INITIAL",
    scheduledDate: formData.get("scheduledDate"),
    assignedToUserId: formData.get("assignedToUserId"),
    inspectorStationLocation:
      formData.get("inspectorStationLocation") || undefined,
  };

  const parsed = inspectionScheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Verify the park exists
  const park = await db.motorPark.findUnique({
    where: { id: data.linkedEntityId },
    select: { id: true, applicationStatus: true, businessName: true },
  });

  if (!park) return { success: false, error: "Motor park not found" };

  // Can only schedule inspection if application is SUBMITTED or UNDER_REVIEW
  const schedulableStatuses = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "INSPECTION_COMPLETED",
  ];
  if (!schedulableStatuses.includes(park.applicationStatus)) {
    return {
      success: false,
      error: `Cannot schedule inspection when status is ${park.applicationStatus}`,
    };
  }

  const [inspection, inspectorUser] = await Promise.all([
    db.inspection.create({
      data: {
        inspectionType: data.inspectionType,
        linkedEntityType: data.linkedEntityType,
        linkedEntityId: data.linkedEntityId,
        motorParkId: data.linkedEntityId,
        scheduledDate: data.scheduledDate,
        scheduledByUserId: session.userId,
        assignedToUserId: data.assignedToUserId,
        inspectorStationLocation: data.inspectorStationLocation,
        status: "PENDING_PS_APPROVAL",
        completedByUserId: data.assignedToUserId, // Will be overwritten on completion
      },
      select: { id: true },
    }),
    db.user.findUnique({
      where: { id: data.assignedToUserId },
      select: { firstName: true, lastName: true },
    }),
    db.motorPark.update({
      where: { id: data.linkedEntityId },
      data: {
        applicationStatus: "INSPECTION_SCHEDULED",
        firstInspectionId:
          data.inspectionType === "INITIAL" ? undefined : undefined,
      },
    }),
    db.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "INSPECTION_SCHEDULED_PENDING_PS_APPROVAL",
        entityType: "MOTOR_PARK",
        entityId: data.linkedEntityId,
        changeDescription: `${data.inspectionType} inspection scheduled for ${data.scheduledDate} (Pending PS Approval)`,
      },
    }),
  ]);

  // Dispatch email notification to Permanent Secretary
  try {
    const [inspectorUser, schedulerUser] = await Promise.all([
      db.user.findUnique({
        where: { id: data.assignedToUserId },
        select: { firstName: true, lastName: true },
      }),
      db.user.findUnique({
        where: { id: session.userId },
        select: { firstName: true, lastName: true, role: true },
      }),
    ]);
    const inspectorName = inspectorUser ? `${inspectorUser.firstName} ${inspectorUser.lastName}` : "Assigned Inspector";
    const scheduledByName = schedulerUser ? `${schedulerUser.firstName} ${schedulerUser.lastName}` : `HOD (${session.role})`;
    await sendInspectionApprovalNotification({
      entityName: park.businessName,
      entityType: "Motor Park",
      scheduledDate: data.scheduledDate,
      inspectorName,
      scheduledByName,
      entityUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://mot.anambra.gov.ng"}/motor-parks/${park.id}`,
    });
  } catch (emailErr) {
    console.error("Failed to send PS email notification for scheduled inspection:", emailErr);
  }

  revalidatePath(`/motor-parks/${data.linkedEntityId}`);
  revalidatePath("/motor-parks");
  revalidatePath("/inspections");

  return { success: true, data: { inspectionId: inspection.id } };
}

// ==================== INSPECTION EXECUTION (FR-012, STORY-024) ====================

/**
 * FR-012: Field inspector submits inspection checklist results and overall assessment.
 * Moves inspection status to COMPLETED, park to INSPECTION_COMPLETED.
 */
export async function submitInspectionReport(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();

  if (!canPerformInspections(session.role)) {
    return {
      success: false,
      error: "Only field inspectors can submit inspection reports",
    };
  }

  const inspectionId = formData.get("inspectionId") as string;
  const overallAssessment = formData.get("overallAssessment") as string;
  const recommendedAction = formData.get("recommendedAction") as string;
  const checklistJson = formData.get("checklistItems") as string;

  if (!inspectionId) return { success: false, error: "Inspection ID required" };
  if (!overallAssessment)
    return { success: false, error: "Overall assessment required" };
  if (!["APPROVE", "REJECT", "CONDITIONAL"].includes(recommendedAction)) {
    return { success: false, error: "Invalid recommended action" };
  }

  const inspection = await db.inspection.findUnique({
    where: { id: inspectionId },
    select: {
      id: true,
      status: true,
      linkedEntityId: true,
      assignedToUserId: true,
      motorParkId: true,
    },
  });

  if (!inspection) return { success: false, error: "Inspection not found" };
  if (inspection.status === "COMPLETED") {
    return { success: false, error: "Inspection already completed" };
  }

  // Field inspectors can only complete their own assigned inspections
  if (
    session.role === "FIELD_INSPECTOR" &&
    inspection.assignedToUserId !== session.userId
  ) {
    return { success: false, error: "You are not assigned to this inspection" };
  }

  // Parse checklist items from JSON
  let checklistItems: Array<{
    checklistItemId: string;
    isCompliant: boolean;
    notes?: string;
    photoUrls?: string;
    score?: number;
  }> = [];

  if (checklistJson) {
    try {
      checklistItems = JSON.parse(checklistJson);
    } catch {
      return { success: false, error: "Invalid checklist data format" };
    }
  }

  const now = new Date();

  // Create checklist results and update inspection in one transaction
  await db.$transaction(async (tx) => {
    // Delete existing checklist results first to prevent duplicates or constraint errors
    await tx.inspectionChecklistResult.deleteMany({
      where: { inspectionId },
    });

    // Insert checklist results
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

    // Update inspection
    await tx.inspection.update({
      where: { id: inspectionId },
      data: {
        status: "COMPLETED",
        overallAssessment,
        recommendedAction,
        completedAt: now,
        completedByUserId: session.userId,
        inspectionEndTime: now,
      },
    });

    // Update motor park status to PENDING_HOD_APPROVAL for HOD review
    if (inspection.motorParkId) {
      await tx.motorPark.update({
        where: { id: inspection.motorParkId },
        data: { applicationStatus: "PENDING_HOD_APPROVAL" },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "INSPECTION_REPORT_SUBMITTED",
        entityType: "INSPECTION",
        entityId: inspectionId,
        changeDescription: `Inspection completed. Recommendation: ${recommendedAction}`,
      },
    });
  });

  if (inspection.motorParkId) {
    revalidatePath(`/motor-parks/${inspection.motorParkId}`);
  }
  revalidatePath("/motor-parks");

  return { success: true };
}

// ==================== WORKFLOW APPROVALS (HOD -> PS -> COMMISSIONER) ====================

/**
 * HOD Parks reviews inspection report and approves to Permanent Secretary.
 */
export async function hodApproveMotorPark(
  parkId: string,
): Promise<ActionResult> {
  await requireRole(["HOD_PARKS", "HOD_PARKS_REVALIDATION", "SYSTEM_ADMIN"]);
  const session = await requireAuth();

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, applicationStatus: true, businessName: true },
  });

  if (!park) return { success: false, error: "Motor park not found" };

  const validStatuses = ["PENDING_HOD_APPROVAL", "INSPECTION_COMPLETED"];
  if (!validStatuses.includes(park.applicationStatus)) {
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
        changeDescription: `HOD reviewed inspection report and signed off application to Permanent Secretary for ${park.businessName}`,
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

  const validStatuses = ["PENDING_PS_APPROVAL", "INSPECTION_COMPLETED"];
  if (!validStatuses.includes(park.applicationStatus)) {
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
  await requireRole(["COMMISSIONER", "PERMANENT_SECRETARY"]);
  const session = await requireAuth();

  const parkId = formData.get("parkId") as string;
  const notes = formData.get("notes") as string;

  if (!parkId) return { success: false, error: "Park ID required" };

  const park = await db.motorPark.findUnique({
    where: { id: parkId },
    select: { id: true, applicationStatus: true, businessName: true },
  });

  if (!park) return { success: false, error: "Motor park not found" };

  if (
    park.applicationStatus !== "INSPECTION_COMPLETED" &&
    park.applicationStatus !== "PENDING_APPROVAL"
  ) {
    return {
      success: false,
      error: "Temporal approval requires a completed inspection",
    };
  }

  await db.motorPark.update({
    where: { id: parkId },
    data: {
      applicationStatus: "TEMPORAL_APPROVAL",
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
