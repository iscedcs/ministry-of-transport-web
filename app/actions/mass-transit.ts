"use server";

/**
 * Mass Transit & Fleet Operator Server Actions — Ministry of Transport Platform
 * Reference: docs/EPICS.md EPIC-003 (STORY-040 to STORY-051)
 * Functional Requirements: FR-020 through FR-030
 *
 * Workflow:
 *  External Applicant → submits fleet application (min 5 vehicles, FR-020/021)
 *  Commissioner/PS → endorses application → routes for terminal inspection
 *  HOD Parks/Revalidation → schedules terminal/depot inspection (5 working day SLA, FR-023)
 *  Field Inspector → submits terminal inspection report
 *  Commissioner/PS → approves branding scheme (FR-025)
 *  Commissioner/PS → issues Permit to Operate Certificate (FR-027)
 *  Finance Officer → records application fee (FR-024) + monthly payments (FR-030)
 *  Commissioner/PS → generates unique QR codes per vehicle (FR-026)
 *  Commissioner/PS → issues driver proficiency cards (FR-029)
 *  Fleet Operator → submits fleet change notifications (FR-028)
 *  Annual renewal → permit renewal workflow (FR-027 annual)
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendInspectionApprovalNotification } from "@/lib/email";
import {
  requireAuth,
  requireRole,
  canScheduleInspections,
  canIssuePermits,
} from "@/lib/auth";
import { inspectionScheduleSchema } from "@/lib/validation-schemas";
import type { ActionResult } from "@/lib/server-actions-pattern";

// ==================== SHARED SCHEMAS ====================

// Simplified vehicle type declaration (only type + count during initial registration)
const vehicleTypeCountSchema = z.object({
  type: z.enum(["BUS", "MINIBUS", "TRUCK", "LIGHT_COMMERCIAL", "TANKER"]),
  count: z.number().int().min(1, "At least 1 vehicle required per type"),
});

// Full vehicle details (submitted after application is approved)
const vehicleDetailSchema = z.object({
  registrationNumber: z.string().min(1, "Registration number required"),
  vehicleType: z.enum([
    "BUS",
    "MINIBUS",
    "TRUCK",
    "LIGHT_COMMERCIAL",
    "TANKER",
  ]),
  make: z.string().min(1, "Vehicle make required"),
  model: z.string().min(1, "Vehicle model required"),
  engineNumber: z.string().min(1, "Engine number required"),
  chassisNumber: z.string().min(1, "Chassis number required"),
  routesServed: z.string().optional(),
  roadworthinessExpiry: z.string().optional(),
});

// Terminal/Depot manager details
const terminalSchema = z.object({
  locationAddress: z.string().min(10, "Terminal address required").max(500),
  gpsCoordinates: z.string().optional(),
  managerName: z.string().min(3, "Manager name required"),
  managerPhone: z.string().min(10, "Manager phone required"),
  managerEmail: z.string().email("Invalid manager email"),
  managerResidentialAddress: z
    .string()
    .min(10, "Manager address required")
    .max(500),
});

const fleetCompanySchema = z.object({
  companyName: z.string().min(3, "Company name required").max(100),
  contactPerson: z.string().min(3, "Contact person required").max(100),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().min(10, "Phone number required"),
  cacNumber: z.string().min(3, "CAC number required"),
  asinNumber: z.string().min(5, "ASIN number required"),
  businessPremisesCert: z.string().optional(),
  ansaaRegistration: z.string().optional(),
  cacDocumentId: z.string().min(1, "CAC Document is required"),
  landOwnershipDocId: z.string().min(1, "Land ownership document is required"),
  corporateAsinDocumentId: z
    .string()
    .min(1, "Corporate ASIN certificate is required"),
});

// ==================== APPLICATION (FR-020 / FR-021 / FR-022, STORY-041) ====================

/**
 * FR-020/FR-021: External applicant submits fleet registration application.
 * Now simplified: only asks for company details, terminal location/manager, and vehicle types + counts.
 * Full vehicle details are collected AFTER approval via VehicleSubmissionRequest.
 */
export async function submitFleetApplication(
  prevState: ActionResult<{ companyId: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ companyId: string }>> {
  const session = await requireRole(["EXTERNAL_APPLICANT"]);

  // Parse vehicle counts (simplified: just type + count)
  const vehicleCountsRaw = formData.get("vehicleTypesJson") as string;
  let vehicleCounts: unknown[];
  try {
    vehicleCounts = JSON.parse(vehicleCountsRaw);
    if (!Array.isArray(vehicleCounts) || vehicleCounts.length === 0) {
      return {
        success: false,
        error: "Please specify at least one vehicle type.",
      };
    }

    // Validate each entry and calculate total
    let totalVehicles = 0;
    for (const vc of vehicleCounts) {
      const parsed = vehicleTypeCountSchema.safeParse(vc);
      if (!parsed.success) {
        return {
          success: false,
          error: `Vehicle entry invalid: ${parsed.error.issues[0].message}`,
        };
      }
      totalVehicles += parsed.data.count;
    }

    if (totalVehicles < 5) {
      return {
        success: false,
        error: "Minimum 5 vehicles required in total (FR-021).",
      };
    }
  } catch {
    return {
      success: false,
      error: "Invalid vehicle count data.",
    };
  }

  // Parse terminals (multiple terminals, each with manager)
  const terminalsRaw = formData.get("terminalsJson") as string;
  let terminals: unknown[];
  try {
    terminals = JSON.parse(terminalsRaw);
    if (!Array.isArray(terminals) || terminals.length === 0) {
      return {
        success: false,
        error: "At least one terminal is required.",
      };
    }

    // Validate each terminal
    for (const terminal of terminals) {
      const parsed = terminalSchema.safeParse(terminal);
      if (!parsed.success) {
        return {
          success: false,
          error: `Terminal validation failed: ${parsed.error.issues[0].message}`,
        };
      }
    }
  } catch {
    return {
      success: false,
      error: "Invalid terminals data.",
    };
  }

  // Validate company details
  const companyParsed = fleetCompanySchema.safeParse({
    companyName: formData.get("companyName"),
    contactPerson: formData.get("contactPerson"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    cacNumber: formData.get("cacNumber"),
    asinNumber: formData.get("asinNumber"),
    businessPremisesCert: formData.get("businessPremisesCert") || undefined,
    ansaaRegistration: formData.get("ansaaRegistration") || undefined,
    cacDocumentId: formData.get("cacDocumentId"),
    landOwnershipDocId: formData.get("landOwnershipDocId"),
    corporateAsinDocumentId: formData.get("corporateAsinDocumentId"),
  });

  if (!companyParsed.success) {
    return { success: false, error: companyParsed.error.issues[0].message };
  }

  const companyData = companyParsed.data;

  // Check for duplicate CAC or ASIN
  const [existingCac, existingAsin] = await Promise.all([
    db.massTransitCompany.findUnique({
      where: { cacNumber: companyData.cacNumber },
      select: { id: true },
    }),
    db.massTransitCompany.findUnique({
      where: { asinNumber: companyData.asinNumber },
      select: { id: true },
    }),
  ]);

  if (existingCac) {
    return {
      success: false,
      error: "A fleet application with this CAC number already exists.",
    };
  }
  if (existingAsin) {
    return {
      success: false,
      error: "A fleet application with this ASIN number already exists.",
    };
  }

  const company = await db.$transaction(async (tx) => {
    // Create company
    const co = await tx.massTransitCompany.create({
      data: {
        companyName: companyData.companyName,
        contactPerson: companyData.contactPerson,
        contactEmail: companyData.contactEmail,
        contactPhone: companyData.contactPhone,
        contactUserId: session.userId,
        cacNumber: companyData.cacNumber,
        asinNumber: companyData.asinNumber,
        businessPremisesCert: companyData.businessPremisesCert,
        ansaaRegistration: companyData.ansaaRegistration,
        cacDocumentId: companyData.cacDocumentId,
        landOwnershipDocId: companyData.landOwnershipDocId,
        corporateAsinDocumentId: companyData.corporateAsinDocumentId,
        applicationStatus: "SUBMITTED",
        currentFleetSize: vehicleCounts.reduce((sum: number, vc: unknown) => {
          const parsed = vehicleTypeCountSchema.safeParse(vc);
          return sum + (parsed.success ? parsed.data.count : 0);
        }, 0),
      },
      select: { id: true },
    });

    // Create terminals with manager details (one per terminal)
    for (const terminalData of terminals) {
      const td = terminalData as any;
      await tx.terminal.create({
        data: {
          companyId: co.id,
          locationAddress: td.locationAddress,
          gpsCoordinates: td.gpsCoordinates || null,
          managerName: td.managerName,
          managerPhone: td.managerPhone,
          managerEmail: td.managerEmail,
          managerResidentialAddress: td.managerResidentialAddress,
        },
      });
    }

    // Create vehicle submission request for later detailed submission
    await tx.vehicleSubmissionRequest.create({
      data: {
        companyId: co.id,
        vehicleCount: vehicleCounts.reduce((sum: number, vc: unknown) => {
          const parsed = vehicleTypeCountSchema.safeParse(vc);
          return sum + (parsed.success ? parsed.data.count : 0);
        }, 0),
        status: "PENDING",
        requestedByUser: session.userId, // Initially the applicant themselves
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "FLEET_APPLICATION_SUBMITTED",
        entityType: "MASS_TRANSIT",
        entityId: co.id,
        changeDescription: `Fleet application submitted for ${companyData.companyName} with ${vehicleCounts.reduce((sum: number, vc: any) => sum + (vc.count || 0), 0)} vehicles`,
      },
    });

    return co;
  });

  revalidatePath("/fleet-operators");
  return { success: true, data: { companyId: company.id } };
}

// ==================== LISTING & FETCHING (STORY-051) ====================

export type FleetApplicationListItem = {
  id: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  applicationStatus: string;
  permitStatus: string | null;
  currentFleetSize: number;
  appliedAt: Date;
  permitExpiresAt: Date | null;
};

/**
 * List fleet applications — filtered by role:
 *  - EXTERNAL_APPLICANT: own companies only
 *  - All staff roles: all companies
 */
export async function listFleetApplications(filters?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<
  ActionResult<{ companies: FleetApplicationListItem[]; total: number }>
> {
  const session = await requireAuth();

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, any> = {};

  if (session.role === "EXTERNAL_APPLICANT") {
    where.contactUserId = session.userId;
  }

  if (filters?.status && filters.status !== "ALL") {
    where.applicationStatus = filters.status;
  }

  if (filters?.search) {
    where.OR = [
      { companyName: { contains: filters.search, mode: "insensitive" } },
      { cacNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [companies, total] = await Promise.all([
    db.massTransitCompany.findMany({
      where,
      skip,
      take: limit,
      orderBy: { appliedAt: "desc" },
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        contactPhone: true,
        applicationStatus: true,
        permitStatus: true,
        currentFleetSize: true,
        appliedAt: true,
        permitExpiresAt: true,
      },
    }),
    db.massTransitCompany.count({ where }),
  ]);

  return { success: true, data: { companies, total } };
}

export type TransitDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  verifiedAt?: Date | null;
  verifiedByUserId?: string | null;
  verificationNotes?: string | null;
  reviews?: {
    id: string;
    reviewedByUserId: string;
    reviewerName: string;
    reviewerRole: string;
    notes: string | null;
    isApproved: boolean;
    reviewedAt: Date;
  }[];
};

export type FleetApplicationDetail = {
  id: string;
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  cacNumber: string;
  asinNumber: string;
  businessPremisesCert: string | null;
  ansaaRegistration: string | null;
  approvedColour: string | null;
  cacDocumentId: string | null;
  landOwnershipDocId: string | null;
  corporateAsinDocumentId: string | null;
  documents?: {
    cac?: TransitDocument;
    land?: TransitDocument;
    asin?: TransitDocument;
  };
  terminals: {
    id: string;
    locationAddress: string;
    gpsCoordinates: string | null;
    managerName: string;
    managerPhone: string;
    managerEmail: string;
    managerResidentialAddress: string;
  }[];
  currentFleetSize: number;
  monthlyLevyAmount: number | null;
  assessedFeeAmount: number | null;
  psRecommendationNotes: string | null;
  applicationStatus: string;
  permitStatus: string | null;
  permitNumber: string | null;
  permitIssuedAt: Date | null;
  permitExpiresAt: Date | null;
  permitDocumentUrl: string | null;
  terminalInspectionDueAt: Date | null;
  lastRevalidatedAt: Date | null;
  nextRevalidationDue: Date | null;
  appliedAt: Date;
  hodApprovedAt: Date | null;
  psApprovedAt: Date | null;
  commissionerApprovedAt: Date | null;
  approvedAt: Date | null;
  approvedByUserId: string | null;
  applicant: { id: string; firstName: string; lastName: string; email: string };
  vehicles: {
    id: string;
    registrationNumber: string;
    vehicleType: string;
    make: string;
    model: string;
    engineNumber: string;
    chassisNumber: string;
    routesServed: string | null;
    roadworthinessExpiry: Date | null;
    status: string;
    qrCodeId: string | null;
    qrCodeGeneratedAt: Date | null;
    addedAt: Date;
    removedAt: Date | null;
  }[];
  drivers: {
    id: string;
    fullName: string;
    licenseNumber: string;
    phoneNumber: string;
    proficiencyCardId: string | null;
    proficiencyCardExpiry: Date | null;
    isActive: boolean;
  }[];
  inspections: {
    id: string;
    inspectionType: string;
    status: string;
    scheduledDate: Date;
    completedAt: Date | null;
    overallAssessment: string | null;
    recommendedAction: string | null;
    assignedTo: { firstName: string; lastName: string };
  }[];
  /** True when a COMPLETED TRANSIT_REGISTRATION payment exists for this company. */
  registrationFeePaid: boolean;
};

/**
 * Get full fleet application detail.
 * RLS enforced — external applicants can only view their own company.
 */
export async function getFleetApplication(
  companyId: string,
): Promise<ActionResult<FleetApplicationDetail>> {
  const session = await requireAuth();

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      companyName: true,
      contactPerson: true,
      contactEmail: true,
      contactPhone: true,
      cacNumber: true,
      asinNumber: true,
      businessPremisesCert: true,
      ansaaRegistration: true,
      approvedColour: true,
      cacDocumentId: true,
      landOwnershipDocId: true,
      corporateAsinDocumentId: true,
      currentFleetSize: true,
      monthlyLevyAmount: true,
      assessedFeeAmount: true,
      psRecommendationNotes: true,
      applicationStatus: true,
      permitStatus: true,
      permitNumber: true,
      permitIssuedAt: true,
      permitExpiresAt: true,
      permitDocumentUrl: true,
      terminalInspectionDueAt: true,
      lastRevalidatedAt: true,
      nextRevalidationDue: true,
      appliedAt: true,
      hodApprovedAt: true,
      psApprovedAt: true,
      commissionerApprovedAt: true,
      approvedAt: true,
      approvedByUserId: true,
      terminals: {
        select: {
          id: true,
          locationAddress: true,
          gpsCoordinates: true,
          managerName: true,
          managerPhone: true,
          managerEmail: true,
          managerResidentialAddress: true,
        },
      },
      applicant: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      vehicles: {
        select: {
          id: true,
          registrationNumber: true,
          vehicleType: true,
          make: true,
          model: true,
          engineNumber: true,
          chassisNumber: true,
          routesServed: true,
          roadworthinessExpiry: true,
          status: true,
          qrCodeId: true,
          qrCodeGeneratedAt: true,
          addedAt: true,
          removedAt: true,
        },
        orderBy: { addedAt: "asc" },
        where: { removedAt: null },
      },
      drivers: {
        select: {
          id: true,
          fullName: true,
          licenseNumber: true,
          phoneNumber: true,
          proficiencyCardId: true,
          proficiencyCardExpiry: true,
          isActive: true,
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  if (!company) return { success: false, error: "Fleet application not found" };

  if (
    session.role === "EXTERNAL_APPLICANT" &&
    company.applicant.id !== session.userId
  ) {
    return { success: false, error: "Access denied" };
  }

  // Fetch inspections polymorphically (linkedEntityType = "MASS_TRANSIT")
  const inspections = await db.inspection.findMany({
    where: { linkedEntityType: "MASS_TRANSIT", linkedEntityId: companyId },
    select: {
      id: true,
      inspectionType: true,
      status: true,
      scheduledDate: true,
      completedAt: true,
      overallAssessment: true,
      recommendedAction: true,
      assignedTo: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  const registrationPayment = await db.payment.findFirst({
    where: {
      linkedEntityType: "MASS_TRANSIT",
      linkedEntityId: companyId,
      status: "COMPLETED",
      paymentType: "TRANSIT_REGISTRATION",
    },
    select: { id: true },
  });

  // Fetch documents
  const docIds = [
    company.cacDocumentId,
    company.landOwnershipDocId,
    company.corporateAsinDocumentId,
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
        orderBy: { reviewedAt: "desc" },
      },
    },
  });

  const documents = {
    cac: docs.find((d) => d.id === company.cacDocumentId),
    land: docs.find((d) => d.id === company.landOwnershipDocId),
    asin: docs.find((d) => d.id === company.corporateAsinDocumentId),
  };

  return {
    success: true,
    data: {
      ...company,
      documents,
      inspections,
      registrationFeePaid: !!registrationPayment,
    },
  };
}

// ==================== VEHICLE MANAGEMENT (FR-022 / FR-028, STORY-042 / STORY-048) ====================

/**
 * FR-022/FR-028: Add a single vehicle to the fleet.
 * Accessible by EXTERNAL_APPLICANT (own company only).
 */
export async function addVehicle(
  prevState: ActionResult<{ vehicleId: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ vehicleId: string }>> {
  const session = await requireRole(["EXTERNAL_APPLICANT"]);

  const companyId = formData.get("companyId") as string;
  if (!companyId) return { success: false, error: "Company ID required" };

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      contactUserId: true,
      applicationStatus: true,
      currentFleetSize: true,
    },
  });

  if (!company) return { success: false, error: "Fleet application not found" };
  if (company.contactUserId !== session.userId) {
    return { success: false, error: "Access denied" };
  }

  const parsed = vehicleDetailSchema.safeParse({
    registrationNumber: formData.get("registrationNumber"),
    vehicleType: formData.get("vehicleType"),
    make: formData.get("make"),
    model: formData.get("model"),
    engineNumber: formData.get("engineNumber"),
    chassisNumber: formData.get("chassisNumber"),
    routesServed: formData.get("routesServed") || undefined,
    roadworthinessExpiry: formData.get("roadworthinessExpiry") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const v = parsed.data;

  const existing = await db.vehicle.findUnique({
    where: { registrationNumber: v.registrationNumber },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      error: "A vehicle with this registration number already exists.",
    };
  }

  const vehicle = await db.$transaction(async (tx) => {
    const veh = await tx.vehicle.create({
      data: {
        companyId,
        registrationNumber: v.registrationNumber,
        vehicleType: v.vehicleType,
        make: v.make,
        model: v.model,
        engineNumber: v.engineNumber,
        chassisNumber: v.chassisNumber,
        routesServed: v.routesServed ?? null,
        roadworthinessExpiry: v.roadworthinessExpiry
          ? new Date(v.roadworthinessExpiry)
          : null,
        addedByUserId: session.userId,
      },
      select: { id: true },
    });

    await tx.massTransitCompany.update({
      where: { id: companyId },
      data: { currentFleetSize: { increment: 1 } },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "VEHICLE_ADDED",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: `Vehicle ${v.registrationNumber} added to fleet`,
      },
    });

    return veh;
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  return { success: true, data: { vehicleId: vehicle.id } };
}

/**
 * FR-028: Remove a vehicle from the fleet (soft delete — sets removedAt).
 * Minimum fleet size of 5 is enforced.
 */
export async function removeVehicle(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["EXTERNAL_APPLICANT"]);

  const vehicleId = formData.get("vehicleId") as string;
  const companyId = formData.get("companyId") as string;
  const removalReason = (formData.get("removalReason") as string) || "";

  if (!vehicleId || !companyId) {
    return { success: false, error: "Vehicle ID and Company ID required" };
  }

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: { id: true, contactUserId: true, currentFleetSize: true },
  });

  if (!company) return { success: false, error: "Fleet application not found" };
  if (company.contactUserId !== session.userId) {
    return { success: false, error: "Access denied" };
  }
  if (company.currentFleetSize <= 5) {
    return {
      success: false,
      error:
        "Cannot remove vehicle — fleet must maintain a minimum of 5 vehicles (FR-021).",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { removedAt: new Date(), status: "SUSPENDED" },
    });

    await tx.massTransitCompany.update({
      where: { id: companyId },
      data: { currentFleetSize: { decrement: 1 } },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "VEHICLE_REMOVED",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: removalReason
          ? `Vehicle ${vehicleId} removed. Reason: ${removalReason}`
          : `Vehicle ${vehicleId} removed from fleet`,
      },
    });
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  return { success: true };
}

// ==================== INSPECTION SCHEDULING (FR-023, STORY-045) ====================

/**
 * FR-023: HOD Parks/Revalidation schedules terminal/depot inspection.
 * Sets 5-working-day SLA deadline.
 */
export async function scheduleTerminalInspection(
  prevState: ActionResult<{ inspectionId: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ inspectionId: string }>> {
  const session = await requireAuth();

  if (!canScheduleInspections(session.role)) {
    return {
      success: false,
      error: "Insufficient permissions to schedule inspections",
    };
  }

  const raw = {
    linkedEntityType: "MASS_TRANSIT",
    linkedEntityId: formData.get("companyId"),
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

  const company = await db.massTransitCompany.findUnique({
    where: { id: data.linkedEntityId },
    select: { id: true, applicationStatus: true, companyName: true },
  });

  if (!company) return { success: false, error: "Fleet application not found" };

  const schedulableStatuses = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "INSPECTION_COMPLETED",
  ];
  if (!schedulableStatuses.includes(company.applicationStatus)) {
    return {
      success: false,
      error: `Cannot schedule inspection — current status is ${company.applicationStatus}.`,
    };
  }

  // Calculate 5 working day SLA from scheduled date
  const dueDate = new Date(data.scheduledDate);
  let workingDaysAdded = 0;
  while (workingDaysAdded < 5) {
    dueDate.setDate(dueDate.getDate() + 1);
    const day = dueDate.getDay();
    if (day !== 0 && day !== 6) workingDaysAdded++;
  }

  const inspection = await db.$transaction(async (tx) => {
    const insp = await tx.inspection.create({
      data: {
        linkedEntityType: "MASS_TRANSIT",
        linkedEntityId: data.linkedEntityId,
        inspectionType: data.inspectionType,
        scheduledDate: data.scheduledDate,
        scheduledByUserId: session.userId,
        assignedToUserId: data.assignedToUserId,
        inspectorStationLocation: data.inspectorStationLocation,
        completedByUserId: session.userId, // placeholder — updated on completion
        status: "PENDING_PS_APPROVAL",
      },
      select: { id: true },
    });

    await tx.massTransitCompany.update({
      where: { id: data.linkedEntityId },
      data: {
        applicationStatus: "INSPECTION_SCHEDULED",
        terminalInspectionId: insp.id,
        terminalInspectionDueAt: dueDate,
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "TERMINAL_INSPECTION_SCHEDULED_PENDING_PS_APPROVAL",
        entityType: "MASS_TRANSIT",
        entityId: data.linkedEntityId,
        changeDescription: `Terminal inspection scheduled for ${company.companyName} on ${data.scheduledDate.toISOString().split("T")[0]} (Pending PS Approval). SLA due: ${dueDate.toISOString().split("T")[0]}`,
      },
    });

    return insp;
  });

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
      entityName: company.companyName,
      entityType: "Mass Transit Fleet",
      scheduledDate: data.scheduledDate,
      inspectorName,
      scheduledByName,
      entityUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://mot.anambra.gov.ng"}/fleet-operators/${company.id}`,
    });
  } catch (emailErr) {
    console.error("Failed to send PS email notification for terminal inspection:", emailErr);
  }

  revalidatePath(`/fleet-operators/${data.linkedEntityId}`);
  revalidatePath("/fleet-operators");
  revalidatePath("/inspections");
  return { success: true, data: { inspectionId: inspection.id } };
}

/**
 * STORY-045: Field Inspector submits terminal/depot inspection report.
 * APPROVE/CONDITIONAL → INSPECTION_COMPLETED; REJECT → REJECTED.
 */
export async function submitTerminalInspectionReport(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["FIELD_INSPECTOR"]);

  const companyId = formData.get("companyId") as string;
  const inspectionId = formData.get("inspectionId") as string;
  const overallAssessment = (formData.get("overallAssessment") as string) || "";
  const recommendedAction = formData.get("recommendedAction") as string;

  if (!companyId || !inspectionId) {
    return {
      success: false,
      error: "Company ID and Inspection ID required",
    };
  }
  if (!["APPROVE", "REJECT", "CONDITIONAL"].includes(recommendedAction)) {
    return {
      success: false,
      error: "Recommended action must be APPROVE, REJECT, or CONDITIONAL",
    };
  }

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: { id: true, applicationStatus: true },
  });

  if (!company) return { success: false, error: "Fleet application not found" };

  const newStatus =
    recommendedAction === "REJECT" ? "REJECTED" : "PENDING_HOD_APPROVAL";

  await db.$transaction(async (tx) => {
    await tx.inspection.update({
      where: { id: inspectionId },
      data: {
        status: "COMPLETED",
        overallAssessment,
        recommendedAction,
        completedAt: new Date(),
        completedByUserId: session.userId,
      },
    });

    await tx.massTransitCompany.update({
      where: { id: companyId },
      data: {
        applicationStatus: newStatus as Parameters<
          typeof tx.massTransitCompany.update
        >[0]["data"]["applicationStatus"],
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "TERMINAL_INSPECTION_COMPLETED",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: `Terminal inspection completed. Recommendation: ${recommendedAction}. ${overallAssessment.slice(0, 100)}`,
      },
    });
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  revalidatePath("/fleet-operators");
  return { success: true };
}

// ==================== BRANDING APPROVAL (FR-025, STORY-044) ====================

/**
 * FR-025: Commissioner/PS approves brand colour for the fleet.
 * All vehicles in the fleet must bear one Ministry-approved colour.
 */
export async function approveBrandingScheme(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();

  if (!canIssuePermits(session.role)) {
    return {
      success: false,
      error:
        "Only Commissioner or Permanent Secretary can approve branding schemes",
    };
  }

  const companyId = formData.get("companyId") as string;
  const approvedColour = formData.get("approvedColour") as string;
  const brandingNotes = (formData.get("brandingNotes") as string) || "";

  if (!companyId) return { success: false, error: "Company ID required" };
  if (!approvedColour || !/^#[0-9A-Fa-f]{6}$/.test(approvedColour)) {
    return {
      success: false,
      error: "Valid hex colour code required (e.g. #FF5733)",
    };
  }

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: { id: true, applicationStatus: true, companyName: true },
  });

  if (!company) return { success: false, error: "Fleet application not found" };

  await db.$transaction(async (tx) => {
    await tx.massTransitCompany.update({
      where: { id: companyId },
      data: {
        approvedColour,
        applicationStatus: "PENDING_APPROVAL",
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "BRANDING_APPROVED",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: brandingNotes
          ? `Brand colour ${approvedColour} approved for ${company.companyName}. Notes: ${brandingNotes}`
          : `Brand colour ${approvedColour} approved for ${company.companyName}`,
      },
    });
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  return { success: true };
}

// ==================== WORKFLOW APPROVALS (HOD -> PS -> COMMISSIONER) ====================

/**
 * HOD Transport Operations reviews inspection report and approves to Permanent Secretary.
 */
export async function hodApproveFleetOperator(
  companyId: string,
): Promise<ActionResult> {
  await requireRole([
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS",
    "HOD_PARKS_REVALIDATION",
    "SYSTEM_ADMIN",
  ]);
  const session = await requireAuth();

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: { id: true, applicationStatus: true, companyName: true },
  });

  if (!company) return { success: false, error: "Fleet application not found" };

  const validStatuses = ["PENDING_HOD_APPROVAL", "INSPECTION_COMPLETED"];
  if (!validStatuses.includes(company.applicationStatus)) {
    return {
      success: false,
      error: `Cannot approve — current status is ${company.applicationStatus}.`,
    };
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.massTransitCompany.update({
      where: { id: companyId },
      data: {
        applicationStatus: "PENDING_PS_APPROVAL",
        hodApprovedAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "HOD_APPROVED_FLEET_OPERATOR",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: `HOD reviewed terminal inspection report and signed off application to Permanent Secretary for ${company.companyName}`,
      },
    });
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  revalidatePath("/fleet-operators");
  return { success: true };
}

/**
 * Permanent Secretary reviews and approves fleet application to Commissioner.
 */
export async function psApproveFleetOperator(
  companyId: string,
  adjustedMonthlyLevy?: number,
  psRecommendationNotes?: string,
): Promise<ActionResult> {
  await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);
  const session = await requireAuth();

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: { id: true, applicationStatus: true, companyName: true, monthlyLevyAmount: true },
  });

  if (!company) return { success: false, error: "Fleet application not found" };

  const validStatuses = ["PENDING_PS_APPROVAL", "INSPECTION_COMPLETED"];
  if (!validStatuses.includes(company.applicationStatus)) {
    return {
      success: false,
      error: `Cannot approve — current status is ${company.applicationStatus}.`,
    };
  }

  const now = new Date();
  const amountInKobo =
    adjustedMonthlyLevy !== undefined && adjustedMonthlyLevy >= 0
      ? Math.round(adjustedMonthlyLevy * 100)
      : company.monthlyLevyAmount;

  await db.$transaction(async (tx) => {
    await tx.massTransitCompany.update({
      where: { id: companyId },
      data: {
        applicationStatus: "PENDING_COMMISSIONER_APPROVAL",
        psApprovedAt: now,
        monthlyLevyAmount: amountInKobo,
        psRecommendationNotes: psRecommendationNotes?.trim() || null,
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "PS_APPROVED_FLEET_OPERATOR",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: `Permanent Secretary submitted recommendation to Commissioner for ${company.companyName}${
          adjustedMonthlyLevy !== undefined
            ? ` with finalized monthly levy of ₦${adjustedMonthlyLevy.toLocaleString()}`
            : ""
        }${psRecommendationNotes ? `. Notes: ${psRecommendationNotes}` : ""}`,
      },
    });
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  revalidatePath("/fleet-operators");
  return { success: true };
}

// ==================== PERMIT TO OPERATE (FR-027, STORY-049) ====================

/**
 * FR-027: Commissioner issues Permit to Operate Certificate.
 * Permit is annual (1-year expiry). Number format: MOT/PTO/YYYY/NNNN.
 */
export async function issuePermitToOperate(
  prevState: ActionResult<{ permitNumber: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ permitNumber: string }>> {
  await requireRole(["COMMISSIONER", "SYSTEM_ADMIN"]);
  const session = await requireAuth();

  const companyId = formData.get("companyId") as string;
  const approvalNotes = (formData.get("approvalNotes") as string) || "";

  if (!companyId) return { success: false, error: "Company ID required" };

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: { id: true, applicationStatus: true, companyName: true },
  });

  if (!company) return { success: false, error: "Fleet application not found" };

  const allowedStatuses = ["PENDING_COMMISSIONER_APPROVAL"];
  if (!allowedStatuses.includes(company.applicationStatus)) {
    return {
      success: false,
      error: `Cannot issue permit — application is in status ${company.applicationStatus}. Permanent Secretary recommendation and approval must be completed first.`,
    };
  }

  const year = new Date().getFullYear();
  const count = await db.massTransitCompany.count({
    where: { permitNumber: { startsWith: `MOT/PTO/${year}/` } },
  });
  const permitNumber = `MOT/PTO/${year}/${String(count + 1).padStart(4, "0")}`;

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.massTransitCompany.update({
      where: { id: companyId },
      data: {
        applicationStatus: "APPROVED",
        permitStatus: "ACTIVE",
        permitNumber,
        permitIssuedAt: now,
        permitExpiresAt: oneYearFromNow,
        nextRevalidationDue: oneYearFromNow,
        approvedAt: now,
        commissionerApprovedAt: now,
        approvedByUserId: session.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "PERMIT_TO_OPERATE_ISSUED",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: approvalNotes
          ? `Permit to Operate issued. Permit: ${permitNumber}. Notes: ${approvalNotes}`
          : `Permit to Operate issued. Permit: ${permitNumber}`,
      },
    });
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  revalidatePath("/fleet-operators");
  return { success: true, data: { permitNumber } };
}

// ==================== QR CODE GENERATION (FR-026, STORY-047) ====================

/**
 * FR-026: Commissioner/PS generates unique QR code for a registered vehicle.
 * QR code data format: MOT/VEH/{vehicleId}/{registrationNumber}
 */
export async function generateVehicleQRCode(
  prevState: ActionResult<{ qrCodeId: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ qrCodeId: string }>> {
  const session = await requireAuth();

  if (!canIssuePermits(session.role)) {
    return {
      success: false,
      error: "Only Commissioner or Permanent Secretary can generate QR codes",
    };
  }

  const vehicleId = formData.get("vehicleId") as string;
  const companyId = formData.get("companyId") as string;

  if (!vehicleId || !companyId) {
    return { success: false, error: "Vehicle ID and Company ID required" };
  }

  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      registrationNumber: true,
      companyId: true,
      qrCodeId: true,
    },
  });

  if (!vehicle) return { success: false, error: "Vehicle not found" };
  if (vehicle.companyId !== companyId) {
    return {
      success: false,
      error: "Vehicle does not belong to this company",
    };
  }
  if (vehicle.qrCodeId) {
    return {
      success: false,
      error: "QR code already generated for this vehicle",
    };
  }

  const qrCodeData = `MOT/VEH/${vehicleId}/${vehicle.registrationNumber}`;
  const qrCodeImageUrl = `/api/qr/${vehicleId}`;

  const qrCode = await db.$transaction(async (tx) => {
    const qr = await tx.vehicleQRCode.create({
      data: {
        vehicleId,
        qrCodeData,
        qrCodeImageUrl,
        generatedAt: new Date(),
      },
      select: { id: true },
    });

    await tx.vehicle.update({
      where: { id: vehicleId },
      data: {
        qrCodeId: qr.id,
        qrCodeGeneratedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "QR_CODE_GENERATED",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: `QR code generated for vehicle ${vehicle.registrationNumber}`,
      },
    });

    return qr;
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  return { success: true, data: { qrCodeId: qrCode.id } };
}

// ==================== DRIVER PROFICIENCY CARDS (FR-029, STORY-043) ====================

/**
 * FR-029: Commissioner/PS issues driver proficiency card.
 * Card number format: MOT/DPC/YYYY/NNNNN. Annual expiry.
 */
export async function issueDriverProficiencyCard(
  prevState: ActionResult<{ cardNumber: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ cardNumber: string }>> {
  const session = await requireAuth();

  if (!canIssuePermits(session.role)) {
    return {
      success: false,
      error: "Only Commissioner or Permanent Secretary can issue driver cards",
    };
  }

  const driverId = formData.get("driverId") as string;
  const companyId = formData.get("companyId") as string;

  if (!driverId || !companyId) {
    return { success: false, error: "Driver ID and Company ID required" };
  }

  const driver = await db.driver.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      companyId: true,
      proficiencyCardId: true,
      fullName: true,
    },
  });

  if (!driver) return { success: false, error: "Driver not found" };
  if (driver.companyId !== companyId) {
    return {
      success: false,
      error: "Driver does not belong to this company",
    };
  }
  if (driver.proficiencyCardId) {
    return {
      success: false,
      error: "Driver already has a proficiency card",
    };
  }

  const year = new Date().getFullYear();
  const count = await db.driverProficiencyCard.count({
    where: { cardNumber: { startsWith: `MOT/DPC/${year}/` } },
  });
  const cardNumber = `MOT/DPC/${year}/${String(count + 1).padStart(5, "0")}`;

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  await db.$transaction(async (tx) => {
    const card = await tx.driverProficiencyCard.create({
      data: {
        cardNumber,
        issuedAt: new Date(),
        expiresAt: oneYearFromNow,
        issuedByAuthority: "Anambra State Ministry of Transport",
      },
      select: { id: true },
    });

    await tx.driver.update({
      where: { id: driverId },
      data: {
        proficiencyCardId: card.id,
        proficiencyCardExpiry: oneYearFromNow,
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "DRIVER_CARD_ISSUED",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: `Driver proficiency card ${cardNumber} issued to ${driver.fullName}`,
      },
    });
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  return { success: true, data: { cardNumber } };
}

// ==================== ANNUAL RENEWAL (FR-027 annual, STORY-050) ====================

/**
 * FR-027 (annual): Initiate annual permit renewal for a fleet operator.
 * Resets application to SUBMITTED for new inspection cycle.
 */
export async function initiateAnnualRenewal(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAuth();

  const allowedRoles = [
    "HOD_PARKS",
    "HOD_PARKS_REVALIDATION",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
  ];

  if (!allowedRoles.includes(session.role)) {
    return {
      success: false,
      error: "Insufficient permissions to initiate annual renewal",
    };
  }

  const companyId = formData.get("companyId") as string;
  if (!companyId) return { success: false, error: "Company ID required" };

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      permitStatus: true,
      companyName: true,
      nextRevalidationDue: true,
    },
  });

  if (!company) return { success: false, error: "Fleet application not found" };
  if (company.permitStatus !== "ACTIVE") {
    return {
      success: false,
      error:
        "Annual renewal can only be initiated for companies with an ACTIVE permit",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.massTransitCompany.update({
      where: { id: companyId },
      data: {
        applicationStatus: "SUBMITTED",
        lastRevalidatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "ANNUAL_RENEWAL_INITIATED",
        entityType: "MASS_TRANSIT",
        entityId: companyId,
        changeDescription: `Annual permit renewal initiated for ${company.companyName}`,
      },
    });
  });

  revalidatePath(`/fleet-operators/${companyId}`);
  revalidatePath("/fleet-operators");
  return { success: true };
}

// ==================== HELPERS ====================

/**
 * Get list of active Field Inspectors for assignment dropdown.
 */
export async function getFleetInspectors(): Promise<
  ActionResult<{ id: string; firstName: string; lastName: string }[]>
> {
  await requireAuth();

  const inspectors = await db.user.findMany({
    where: { role: "FIELD_INSPECTOR", isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return { success: true, data: inspectors };
}

/**
 * Get fleet application status summary for dashboard.
 * For applicants: their own applications and pending vehicle submissions.
 * For staff: all applications.
 */
export type FleetStatusSummary = {
  total: number;
  submitted: number;
  underReview: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  pendingVehicleSubmission: number; // Awaiting vehicle detail submission
};

export async function getFleetStatusSummary(): Promise<
  ActionResult<FleetStatusSummary>
> {
  const session = await requireAuth();

  const userId =
    session.role === "EXTERNAL_APPLICANT" ? session.userId : undefined;

  const [statusCounts, pendingVehicleSubmissions] = await Promise.all([
    db.massTransitCompany.groupBy({
      by: ["applicationStatus"],
      where: userId ? { contactUserId: userId } : {},
      _count: { _all: true },
    }),
    db.vehicleSubmissionRequest.count({
      where: {
        company: userId ? { contactUserId: userId } : undefined,
        status: "PENDING",
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
      pendingApproval: counts.PENDING_APPROVAL ?? 0,
      approved: counts.APPROVED ?? 0,
      rejected: counts.REJECTED ?? 0,
      pendingVehicleSubmission: pendingVehicleSubmissions,
    },
  };
}

// ==================== VEHICLE SUBMISSION (NEW WORKFLOW) ====================

/**
 * Get pending vehicle submission requests for an applicant.
 * Shows on their dashboard so they know they need to submit vehicle details.
 */
export async function getPendingVehicleSubmissionRequests(): Promise<
  ActionResult<
    Array<{
      id: string;
      companyId: string;
      companyName: string;
      vehicleCount: number;
      requestedAt: Date;
    }>
  >
> {
  const session = await requireRole(["EXTERNAL_APPLICANT"]);

  const requests = await db.vehicleSubmissionRequest.findMany({
    where: {
      company: { contactUserId: session.userId },
      status: "PENDING",
    },
    select: {
      id: true,
      companyId: true,
      vehicleCount: true,
      requestedAt: true,
      company: { select: { companyName: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return {
    success: true,
    data: requests.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      companyName: r.company.companyName,
      vehicleCount: r.vehicleCount,
      requestedAt: r.requestedAt,
    })),
  };
}

/**
 * Applicant submits vehicle details in response to a VehicleSubmissionRequest.
 * Receives an array of vehicles to submit for the requested count.
 */
export async function submitVehicleDetails(
  prevState: ActionResult<void> | undefined,
  formData: FormData,
): Promise<ActionResult<void>> {
  const session = await requireRole(["EXTERNAL_APPLICANT"]);

  const submissionRequestId = formData.get("submissionRequestId") as string;
  const vehiclesJson = formData.get("vehicles") as string;

  // Verify the request belongs to this user's company
  const request = await db.vehicleSubmissionRequest.findUnique({
    where: { id: submissionRequestId },
    select: {
      id: true,
      companyId: true,
      vehicleCount: true,
      status: true,
      company: { select: { contactUserId: true } },
    },
  });

  if (!request) {
    return { success: false, error: "Vehicle submission request not found." };
  }

  if (request.company.contactUserId !== session.userId) {
    return { success: false, error: "Unauthorized." };
  }

  if (request.status !== "PENDING") {
    return {
      success: false,
      error: "This request is no longer pending.",
    };
  }

  // Parse and validate vehicles
  let vehicles: unknown[];
  try {
    vehicles = JSON.parse(vehiclesJson);
    if (!Array.isArray(vehicles) || vehicles.length !== request.vehicleCount) {
      return {
        success: false,
        error: `Please submit exactly ${request.vehicleCount} vehicles.`,
      };
    }
  } catch {
    return { success: false, error: "Invalid vehicle data." };
  }

  const parsedVehicles: z.infer<typeof vehicleDetailSchema>[] = [];
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicleDetailSchema.safeParse(vehicles[i]);
    if (!v.success) {
      return {
        success: false,
        error: `Vehicle ${i + 1}: ${v.error.issues[0].message}`,
      };
    }
    parsedVehicles.push(v.data);
  }

  // Create vehicle submissions and create Vehicle records
  await db.$transaction(async (tx) => {
    for (const v of parsedVehicles) {
      // Create VehicleSubmission record
      await tx.vehicleSubmission.create({
        data: {
          submissionRequestId,
          registrationNumber: v.registrationNumber,
          vehicleType: v.vehicleType,
          make: v.make,
          model: v.model,
          engineNumber: v.engineNumber,
          chassisNumber: v.chassisNumber,
          routesServed: v.routesServed || null,
          roadworthinessExpiry: v.roadworthinessExpiry
            ? new Date(v.roadworthinessExpiry)
            : null,
        },
      });

      // Also create actual Vehicle record linked to company
      await tx.vehicle.create({
        data: {
          companyId: request.companyId,
          registrationNumber: v.registrationNumber,
          vehicleType: v.vehicleType,
          make: v.make,
          model: v.model,
          engineNumber: v.engineNumber,
          chassisNumber: v.chassisNumber,
          routesServed: v.routesServed || null,
          roadworthinessExpiry: v.roadworthinessExpiry
            ? new Date(v.roadworthinessExpiry)
            : null,
          addedByUserId: session.userId,
        },
      });
    }

    // Mark request as submitted
    await tx.vehicleSubmissionRequest.update({
      where: { id: submissionRequestId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        performedByUserId: session.userId,
        action: "VEHICLE_DETAILS_SUBMITTED",
        entityType: "MASS_TRANSIT",
        entityId: submissionRequestId,
        changeDescription: `${parsedVehicles.length} vehicle details submitted for request ${submissionRequestId}`,
      },
    });
  });

  revalidatePath("/fleet-operators");
  return { success: true };
}

/**
 * Staff/Commissioner requests an applicant to submit vehicle details.
 * Called after application approval, to request the detailed vehicle information.
 */
export async function requestVehicleSubmission(
  companyId: string,
  vehicleCount: number,
): Promise<ActionResult<void>> {
  const session = await requireAuth();

  // Verify requester has permission
  const canRequest = canIssuePermits(session.role);
  if (!canRequest) {
    return { success: false, error: "Unauthorized." };
  }

  // Check if company exists
  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    return { success: false, error: "Company not found." };
  }

  // Check if a request already exists for this company
  const existingRequest = await db.vehicleSubmissionRequest.findFirst({
    where: { companyId },
    select: { id: true },
  });

  // Create or update vehicle submission request
  if (existingRequest) {
    await db.vehicleSubmissionRequest.update({
      where: { id: existingRequest.id },
      data: {
        vehicleCount,
        status: "PENDING",
        requestedByUser: session.userId,
      },
    });
  } else {
    await db.vehicleSubmissionRequest.create({
      data: {
        companyId,
        vehicleCount,
        status: "PENDING",
        requestedByUser: session.userId,
      },
    });
  }

  revalidatePath(`/fleet-operators/${companyId}`);
  return { success: true };
}
