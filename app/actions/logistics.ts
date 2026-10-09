"use server";

/**
 * Logistics registration — Server Actions.
 *
 * A logistics applicant is a company (several vehicles) or an individual
 * (one vehicle). The chain: SUBMITTED -> HOD Operations sets the monthly fee
 * and recommends -> PENDING_PS_APPROVAL -> PS approves -> PENDING_COMMISSIONER_APPROVAL
 * -> Commissioner approves -> APPROVED, with a permit number assigned and the
 * letter ready. Rejection is allowed at any stage, with a mandatory reason.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  LOGISTICS_BASE_WRITE_ROLES,
  LOGISTICS_BASE_VIEW_ROLES,
  LOGISTICS_HOD_OPS_ROLES,
  LOGISTICS_PS_ROLES,
  LOGISTICS_COMMISSIONER_ROLES,
  LOGISTICS_APPROVAL_ROLES,
  LOGISTICS_EDIT_ROLES,
} from "@/lib/logistics-roles";
import type { ApplicationStatus, LogisticsApplicantType } from "@prisma/client";

function blank(v: string | undefined | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export interface LogisticsVehicleInput {
  plateNumber: string;
  vehicleType: string;
  chassisNumber?: string;
  make?: string;
  model?: string;
  color?: string;
  stickerNumber?: string;
}

export interface LogisticsApplicantInput {
  applicantType: LogisticsApplicantType;
  companyName?: string;
  cacNumber?: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  address?: string;
  vehicles: LogisticsVehicleInput[];
}

/** Register a logistics company or individual, with at least one vehicle. */
export async function registerLogisticsApplicant(
  input: LogisticsApplicantInput,
): Promise<{ success: true; applicantId: string } | { success: false; error: string }> {
  const authz = await authorize(LOGISTICS_BASE_WRITE_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!input.contactPerson?.trim() || !input.contactPhone?.trim()) {
    return { success: false, error: "Contact name and phone number are required." };
  }
  if (input.applicantType === "COMPANY" && !input.companyName?.trim()) {
    return { success: false, error: "Company name is required." };
  }
  if (!input.vehicles || input.vehicles.length === 0) {
    return { success: false, error: "At least one vehicle is required." };
  }
  if (input.applicantType === "INDIVIDUAL" && input.vehicles.length > 1) {
    return { success: false, error: "An individual registers a single vehicle." };
  }
  for (const v of input.vehicles) {
    if (!v.plateNumber?.trim() || !v.vehicleType?.trim()) {
      return { success: false, error: "Every vehicle needs a plate number and a vehicle type." };
    }
  }

  const plates = input.vehicles.map((v) => v.plateNumber.trim().toUpperCase());
  const clash = await db.logisticsVehicle.findFirst({
    where: { plateNumber: { in: plates } },
    select: { plateNumber: true },
  });
  if (clash) {
    return { success: false, error: `Plate number ${clash.plateNumber} is already registered.` };
  }

  try {
    const applicant = await db.logisticsApplicant.create({
      data: {
        applicantType: input.applicantType,
        companyName: input.applicantType === "COMPANY" ? input.companyName!.trim() : null,
        cacNumber: input.applicantType === "COMPANY" ? blank(input.cacNumber) : null,
        contactPerson: input.contactPerson.trim(),
        contactPhone: input.contactPhone.trim(),
        contactEmail: blank(input.contactEmail),
        address: blank(input.address),
        capturedByUserId: authz.session.userId,
        vehicles: {
          create: input.vehicles.map((v) => ({
            plateNumber: v.plateNumber.trim().toUpperCase(),
            vehicleType: v.vehicleType.trim(),
            chassisNumber: blank(v.chassisNumber),
            make: blank(v.make),
            model: blank(v.model),
            color: blank(v.color),
            stickerNumber: blank(v.stickerNumber),
          })),
        },
      },
      select: { id: true },
    });

    await recordAudit({
      action: "LOGISTICS_APPLICANT_REGISTERED",
      entityType: "LOGISTICS",
      entityId: applicant.id,
      changeDescription: `Logistics ${input.applicantType === "COMPANY" ? "company" : "operator"} ${
        input.applicantType === "COMPANY" ? input.companyName : input.contactPerson
      } registered with ${input.vehicles.length} vehicle(s)`,
      newValues: { applicantType: input.applicantType, status: "SUBMITTED" },
    });

    revalidatePath("/logistics");
    return { success: true, applicantId: applicant.id };
  } catch (err) {
    console.error("registerLogisticsApplicant error:", err);
    return { success: false, error: "Could not register. Check the details and try again." };
  }
}

/** Add another vehicle to an existing (company) applicant. */
export async function addLogisticsVehicle(
  applicantId: string,
  vehicle: LogisticsVehicleInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const authz = await authorize(LOGISTICS_BASE_WRITE_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!vehicle.plateNumber?.trim() || !vehicle.vehicleType?.trim()) {
    return { success: false, error: "Plate number and vehicle type are required." };
  }

  const applicant = await db.logisticsApplicant.findUnique({
    where: { id: applicantId },
    select: { applicantType: true },
  });
  if (!applicant) return { success: false, error: "Applicant not found." };
  if (applicant.applicantType === "INDIVIDUAL") {
    return { success: false, error: "An individual operator registers a single vehicle." };
  }

  const plateNumber = vehicle.plateNumber.trim().toUpperCase();
  const clash = await db.logisticsVehicle.findUnique({
    where: { plateNumber },
    select: { id: true },
  });
  if (clash) return { success: false, error: "This plate number is already registered." };

  await db.logisticsVehicle.create({
    data: {
      applicantId,
      plateNumber,
      vehicleType: vehicle.vehicleType.trim(),
      chassisNumber: blank(vehicle.chassisNumber),
      make: blank(vehicle.make),
      model: blank(vehicle.model),
      color: blank(vehicle.color),
      stickerNumber: blank(vehicle.stickerNumber),
    },
  });

  await recordAudit({
    action: "LOGISTICS_VEHICLE_ADDED",
    entityType: "LOGISTICS",
    entityId: applicantId,
    changeDescription: `Vehicle ${plateNumber} added`,
  });

  revalidatePath(`/logistics/${applicantId}`);
  return { success: true };
}

/** Correct a registration mistake — same shape as registration, full overwrite of applicant fields. */
export async function updateLogisticsApplicant(
  id: string,
  input: Omit<LogisticsApplicantInput, "vehicles">,
): Promise<{ success: true } | { success: false; error: string }> {
  const authz = await authorize(LOGISTICS_EDIT_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!input.contactPerson?.trim() || !input.contactPhone?.trim()) {
    return { success: false, error: "Contact name and phone number are required." };
  }
  if (input.applicantType === "COMPANY" && !input.companyName?.trim()) {
    return { success: false, error: "Company name is required." };
  }

  const existing = await db.logisticsApplicant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Applicant not found." };

  try {
    await db.logisticsApplicant.update({
      where: { id },
      data: {
        companyName: input.applicantType === "COMPANY" ? input.companyName!.trim() : null,
        cacNumber: input.applicantType === "COMPANY" ? blank(input.cacNumber) : null,
        contactPerson: input.contactPerson.trim(),
        contactPhone: input.contactPhone.trim(),
        contactEmail: blank(input.contactEmail),
        address: blank(input.address),
      },
    });

    await recordAudit({
      action: "LOGISTICS_APPLICANT_EDITED",
      entityType: "LOGISTICS",
      entityId: id,
      changeDescription: "Applicant details corrected",
    });

    revalidatePath(`/logistics/${id}`);
    revalidatePath("/logistics");
    return { success: true };
  } catch (err) {
    console.error("updateLogisticsApplicant error:", err);
    return { success: false, error: "Could not save the changes." };
  }
}

/** HOD Operations sets the monthly fee and records a recommendation. */
export async function hodOpsReviewLogistics(
  applicantId: string,
  monthlyFeeAmountNaira: number,
  recommendation: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const authz = await authorize(LOGISTICS_HOD_OPS_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!recommendation?.trim()) {
    return { success: false, error: "A recommendation is required." };
  }
  if (!monthlyFeeAmountNaira || monthlyFeeAmountNaira <= 0) {
    return { success: false, error: "Set the monthly fee before forwarding." };
  }

  const applicant = await db.logisticsApplicant.findUnique({
    where: { id: applicantId },
    select: { applicationStatus: true },
  });
  if (!applicant) return { success: false, error: "Applicant not found." };
  if (applicant.applicationStatus !== "SUBMITTED") {
    return {
      success: false,
      error: `This application is not at your stage (currently ${applicant.applicationStatus}).`,
    };
  }

  await db.logisticsApplicant.update({
    where: { id: applicantId },
    data: {
      applicationStatus: "PENDING_PS_APPROVAL",
      monthlyFeeAmount: Math.round(monthlyFeeAmountNaira * 100),
      hodOpsRecommendation: recommendation.trim(),
      hodOpsApprovedAt: new Date(),
      hodOpsApprovedByUserId: authz.session.userId,
    },
  });

  await recordAudit({
    action: "LOGISTICS_HOD_OPS_RECOMMENDED",
    entityType: "LOGISTICS",
    entityId: applicantId,
    changeDescription: `HOD Operations set the monthly fee and forwarded to the Permanent Secretary`,
  });

  revalidatePath(`/logistics/${applicantId}`);
  return { success: true };
}

/**
 * Permanent Secretary approves, forwarding to the Commissioner. May override
 * the fee HOD Operations recommended — the PS has the final word on amounts
 * below the Commissioner.
 */
export async function psApproveLogistics(
  applicantId: string,
  adjustedMonthlyFeeNaira?: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const authz = await authorize(LOGISTICS_PS_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  const applicant = await db.logisticsApplicant.findUnique({
    where: { id: applicantId },
    select: { applicationStatus: true, monthlyFeeAmount: true },
  });
  if (!applicant) return { success: false, error: "Applicant not found." };
  if (applicant.applicationStatus !== "PENDING_PS_APPROVAL") {
    return {
      success: false,
      error: `This application is not awaiting your approval (currently ${applicant.applicationStatus}).`,
    };
  }

  const monthlyFeeAmount =
    adjustedMonthlyFeeNaira !== undefined && adjustedMonthlyFeeNaira > 0
      ? Math.round(adjustedMonthlyFeeNaira * 100)
      : applicant.monthlyFeeAmount;

  await db.logisticsApplicant.update({
    where: { id: applicantId },
    data: {
      applicationStatus: "PENDING_COMMISSIONER_APPROVAL",
      monthlyFeeAmount,
      psApprovedAt: new Date(),
      psApprovedByUserId: authz.session.userId,
    },
  });

  await recordAudit({
    action: "LOGISTICS_PS_APPROVED",
    entityType: "LOGISTICS",
    entityId: applicantId,
    changeDescription:
      adjustedMonthlyFeeNaira !== undefined
        ? `Permanent Secretary approved, adjusted the monthly fee to ₦${adjustedMonthlyFeeNaira.toLocaleString()}, and forwarded to the Commissioner`
        : "Permanent Secretary approved; forwarded to the Commissioner",
  });

  revalidatePath(`/logistics/${applicantId}`);
  return { success: true };
}

/** Generates the next logistics permit/reference number. Format: ANS-MOT-LOG-YYYY/##### */
async function generateLogisticsPermitNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ANS-MOT-LOG-${year}/`;
  const count = await db.logisticsApplicant.count({
    where: { permitNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

/**
 * Commissioner gives final approval and the permit/letter reference number is
 * assigned. May override the fee one last time — the final word before it is
 * printed on the letter.
 */
export async function commissionerApproveLogistics(
  applicantId: string,
  adjustedMonthlyFeeNaira?: number,
): Promise<{ success: true; permitNumber: string } | { success: false; error: string }> {
  const authz = await authorize(LOGISTICS_COMMISSIONER_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  const applicant = await db.logisticsApplicant.findUnique({
    where: { id: applicantId },
    select: { applicationStatus: true, monthlyFeeAmount: true },
  });
  if (!applicant) return { success: false, error: "Applicant not found." };
  if (applicant.applicationStatus !== "PENDING_COMMISSIONER_APPROVAL") {
    return {
      success: false,
      error: `This application is not awaiting your approval (currently ${applicant.applicationStatus}).`,
    };
  }

  const monthlyFeeAmount =
    adjustedMonthlyFeeNaira !== undefined && adjustedMonthlyFeeNaira > 0
      ? Math.round(adjustedMonthlyFeeNaira * 100)
      : applicant.monthlyFeeAmount;

  const permitNumber = await generateLogisticsPermitNumber();
  const now = new Date();

  await db.logisticsApplicant.update({
    where: { id: applicantId },
    data: {
      applicationStatus: "APPROVED",
      monthlyFeeAmount,
      permitNumber,
      permitIssuedAt: now,
      commissionerApprovedAt: now,
      commissionerApprovedByUserId: authz.session.userId,
    },
  });

  await recordAudit({
    action: "LOGISTICS_COMMISSIONER_APPROVED",
    entityType: "LOGISTICS",
    entityId: applicantId,
    changeDescription:
      adjustedMonthlyFeeNaira !== undefined
        ? `Commissioner approved, adjusted the monthly fee to ₦${adjustedMonthlyFeeNaira.toLocaleString()}; reference ${permitNumber} issued`
        : `Commissioner approved; reference ${permitNumber} issued`,
  });

  revalidatePath(`/logistics/${applicantId}`);
  revalidatePath("/logistics");
  return { success: true, permitNumber };
}

/** Reject at whichever stage the caller holds. Mandatory reason. */
export async function rejectLogisticsApplicant(
  applicantId: string,
  reason: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!reason?.trim()) return { success: false, error: "A reason is required." };

  const authz = await authorize(LOGISTICS_APPROVAL_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  const applicant = await db.logisticsApplicant.findUnique({
    where: { id: applicantId },
    select: { applicationStatus: true },
  });
  if (!applicant) return { success: false, error: "Applicant not found." };

  const stageRole: Record<string, string> = {
    SUBMITTED: "HOD_TRANSPORT_OPS",
    PENDING_PS_APPROVAL: "PERMANENT_SECRETARY",
    PENDING_COMMISSIONER_APPROVAL: "COMMISSIONER",
  };
  const owner = stageRole[applicant.applicationStatus];
  if (!owner) {
    return {
      success: false,
      error: `This application cannot be rejected from ${applicant.applicationStatus}.`,
    };
  }
  if (authz.session.role !== "SYSTEM_ADMIN" && authz.session.role !== owner) {
    return { success: false, error: "This application is not at your stage." };
  }

  await db.logisticsApplicant.update({
    where: { id: applicantId },
    data: {
      applicationStatus: "REJECTED",
      rejectionReason: reason.trim(),
    },
  });

  await recordAudit({
    action: "LOGISTICS_REJECTED",
    entityType: "LOGISTICS",
    entityId: applicantId,
    changeDescription: `${authz.session.role} rejected the application: ${reason.trim()}`,
  });

  revalidatePath(`/logistics/${applicantId}`);
  revalidatePath("/logistics");
  return { success: true };
}

export interface LogisticsListItem {
  id: string;
  applicantType: LogisticsApplicantType;
  name: string;
  contactPhone: string;
  vehicleCount: number;
  status: ApplicationStatus;
  permitNumber: string | null;
  createdAt: Date;
}

export async function listLogisticsApplicants(filters?: {
  page?: number;
  search?: string;
  status?: ApplicationStatus;
}): Promise<
  | {
      success: true;
      applicants: LogisticsListItem[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
      stats: { total: number; approved: number; pending: number };
    }
  | { success: false; error: string }
> {
  const authz = await authorize(LOGISTICS_BASE_VIEW_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  const pageSize = 25;
  const page = Math.max(1, filters?.page ?? 1);

  const where: Record<string, unknown> = {};
  if (filters?.status) where.applicationStatus = filters.status;
  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { contactPerson: { contains: q, mode: "insensitive" } },
      { permitNumber: { contains: q, mode: "insensitive" } },
      { vehicles: { some: { plateNumber: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [applicants, total, approved, pending] = await Promise.all([
    db.logisticsApplicant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        applicantType: true,
        companyName: true,
        contactPerson: true,
        contactPhone: true,
        applicationStatus: true,
        permitNumber: true,
        createdAt: true,
        _count: { select: { vehicles: true } },
      },
    }),
    db.logisticsApplicant.count({ where }),
    db.logisticsApplicant.count({ where: { applicationStatus: "APPROVED" } }),
    db.logisticsApplicant.count({
      where: { applicationStatus: { in: ["SUBMITTED", "PENDING_PS_APPROVAL", "PENDING_COMMISSIONER_APPROVAL"] } },
    }),
  ]);

  return {
    success: true,
    applicants: applicants.map((a) => ({
      id: a.id,
      applicantType: a.applicantType,
      name: a.applicantType === "COMPANY" ? (a.companyName ?? "—") : a.contactPerson,
      contactPhone: a.contactPhone,
      vehicleCount: a._count.vehicles,
      status: a.applicationStatus,
      permitNumber: a.permitNumber,
      createdAt: a.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    stats: { total, approved, pending },
  };
}

export async function getLogisticsApplicant(id: string) {
  const authz = await authorize(LOGISTICS_BASE_VIEW_ROLES);
  if (!authz.ok) return { success: false as const, error: authz.error };

  const applicant = await db.logisticsApplicant.findUnique({
    where: { id },
    include: {
      vehicles: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!applicant) return { success: false as const, error: "Applicant not found." };

  return { success: true as const, applicant };
}
