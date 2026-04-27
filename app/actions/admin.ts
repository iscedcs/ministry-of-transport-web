"use server";

/**
 * Admin Server Actions — Ministry of Transport Platform
 * EPIC-005 | STORY-080 through STORY-090
 * FR-001 through FR-004 (User management, audit trail, config)
 *
 * Access: SYSTEM_ADMIN, PERMANENT_SECRETARY (where noted)
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/server-actions-pattern";
import type { UserRole } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  designation: string | null;
  departmentId: string | null;
  stationLocation: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changeDescription: string | null;
  ipAddress: string | null;
  createdAt: Date;
  performer: {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
  };
}

export interface FeeScheduleItem {
  id: string;
  feeType: string;
  description: string | null;
  amount: number;
  currency: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  revenueCode: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  linkedEntityType: string;
  description: string | null;
  isActive: boolean;
  items: {
    id: string;
    itemName: string;
    itemCategory: string;
    isRequired: boolean;
    sortOrder: number;
  }[];
}

export interface SystemConfigEntry {
  id: string;
  configKey: string;
  configValue: string;
  description: string | null;
  updatedAt: Date;
}

// ── STORY-080/081: Staff User Management ─────────────────────────────────────

export async function listStaffUsers(): Promise<ActionResult<StaffUser[]>> {
  await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  const users = await db.user.findMany({
    where: { role: { not: "EXTERNAL_APPLICANT" } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      designation: true,
      departmentId: true,
      stationLocation: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return { success: true, data: users };
}

export async function getStaffUser(
  userId: string,
): Promise<ActionResult<StaffUser>> {
  await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      designation: true,
      departmentId: true,
      stationLocation: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user || user.role === "EXTERNAL_APPLICANT") {
    return { success: false, error: "User not found" };
  }

  return { success: true, data: user };
}

const updateStaffSchema = z.object({
  userId: z.string().cuid(),
  firstName: z.string().min(2).trim(),
  lastName: z.string().min(2).trim(),
  phone: z.string().optional().or(z.literal("")),
  role: z.enum([
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "HOD_PARKS",
    "HOD_VIS",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "FIELD_INSPECTOR",
    "FINANCE_OFFICER",
    "VEHICLE_INSPECTION_OFFICER",
    "SYSTEM_ADMIN",
  ] as const),
  designation: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  stationLocation: z.string().optional().or(z.literal("")),
});

export async function updateStaffUser(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  const validated = updateStaffSchema.safeParse({
    userId: formData.get("userId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    designation: formData.get("designation"),
    departmentId: formData.get("departmentId"),
    stationLocation: formData.get("stationLocation"),
  });

  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const {
    userId,
    firstName,
    lastName,
    phone,
    role,
    designation,
    departmentId,
    stationLocation,
  } = validated.data;

  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!existing || existing.role === "EXTERNAL_APPLICANT") {
    return { success: false, error: "User not found" };
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      phone: phone || null,
      role,
      designation: designation || null,
      departmentId: departmentId || null,
      stationLocation: stationLocation || null,
    },
    select: { id: true },
  });

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "STAFF_ACCOUNT_UPDATED",
      entityType: "User",
      entityId: updated.id,
      newValues: JSON.stringify({ role, designation }),
      changeDescription: `Role updated to ${role}`,
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleStaffActive(
  userId: string,
  activate: boolean,
): Promise<ActionResult> {
  const session = await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || user.role === "EXTERNAL_APPLICANT") {
    return { success: false, error: "User not found" };
  }

  await db.user.update({
    where: { id: userId },
    data: { isActive: activate },
  });

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: activate
        ? "STAFF_ACCOUNT_ACTIVATED"
        : "STAFF_ACCOUNT_DEACTIVATED",
      entityType: "User",
      entityId: userId,
      changeDescription: activate
        ? "Account reactivated"
        : "Account deactivated",
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// ── STORY-088: Audit Trail Viewer ─────────────────────────────────────────────

export async function listAuditLogs(
  page = 1,
  entityType?: string,
  action?: string,
): Promise<ActionResult<{ logs: AuditLogEntry[]; total: number }>> {
  await requireRole(["COMMISSIONER", "PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        performedBy: {
          select: { firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 25,
      take: 25,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    success: true,
    data: {
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        changeDescription: l.changeDescription,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
        performer: l.performedBy,
      })),
      total,
    },
  };
}

// ── STORY-083: Fee Schedule ───────────────────────────────────────────────────

export async function listFeeSchedules(): Promise<
  ActionResult<FeeScheduleItem[]>
> {
  await requireRole([
    "FINANCE_OFFICER",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
  ]);

  const fees = await db.feeSchedule.findMany({
    orderBy: [{ isActive: "desc" }, { feeType: "asc" }],
  });

  return { success: true, data: fees };
}

const feeScheduleSchema = z.object({
  feeType: z.string().min(3).trim().toUpperCase(),
  description: z.string().optional().or(z.literal("")),
  amountNaira: z.coerce.number().positive("Amount must be positive"),
  effectiveFrom: z.string().pipe(z.coerce.date()),
  effectiveTo: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? new Date(v) : null)),
  revenueCode: z.string().optional().or(z.literal("")),
});

export async function createFeeSchedule(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  const validated = feeScheduleSchema.safeParse({
    feeType: formData.get("feeType"),
    description: formData.get("description"),
    amountNaira: formData.get("amountNaira"),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo"),
    revenueCode: formData.get("revenueCode"),
  });

  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const {
    feeType,
    description,
    amountNaira,
    effectiveFrom,
    effectiveTo,
    revenueCode,
  } = validated.data;

  const fee = await db.feeSchedule.create({
    data: {
      feeType,
      description: description || null,
      amount: Math.round(amountNaira * 100), // naira → kobo
      effectiveFrom,
      effectiveTo: effectiveTo ?? null,
      revenueCode: revenueCode || null,
      isActive: true,
    },
    select: { id: true },
  });

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "FEE_SCHEDULE_CREATED",
      entityType: "FeeSchedule",
      entityId: fee.id,
      newValues: JSON.stringify({ feeType, amountNaira }),
    },
  });

  revalidatePath("/admin/fees");
  return { success: true };
}

export async function toggleFeeScheduleActive(
  feeId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const session = await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  await db.feeSchedule.update({ where: { id: feeId }, data: { isActive } });

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: isActive ? "FEE_SCHEDULE_ACTIVATED" : "FEE_SCHEDULE_DEACTIVATED",
      entityType: "FeeSchedule",
      entityId: feeId,
    },
  });

  revalidatePath("/admin/fees");
  return { success: true };
}

// ── STORY-082: Checklist Config ───────────────────────────────────────────────

export async function listChecklistTemplates(): Promise<
  ActionResult<ChecklistTemplate[]>
> {
  await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  const templates = await db.inspectionChecklistTemplate.findMany({
    include: {
      items: {
        select: {
          id: true,
          itemName: true,
          itemCategory: true,
          isRequired: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return { success: true, data: templates };
}

// ── STORY-085/086: System Configuration ──────────────────────────────────────

export async function listSystemConfig(): Promise<
  ActionResult<SystemConfigEntry[]>
> {
  await requireRole(["SYSTEM_ADMIN"]);

  const configs = await db.systemConfiguration.findMany({
    orderBy: { configKey: "asc" },
  });

  return { success: true, data: configs };
}

export async function upsertSystemConfig(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["SYSTEM_ADMIN"]);

  const key = formData.get("configKey")?.toString().trim();
  const value = formData.get("configValue")?.toString().trim();
  const description =
    formData.get("description")?.toString().trim() || undefined;

  if (!key || !value) {
    return { success: false, error: "Config key and value are required" };
  }

  // Sanitise: block secret keys from being stored as config values
  if (
    key.toUpperCase().includes("SECRET") ||
    key.toUpperCase().includes("PASSWORD")
  ) {
    return {
      success: false,
      error:
        "Secrets and passwords must be stored as environment variables, not in system configuration.",
    };
  }

  await db.systemConfiguration.upsert({
    where: { configKey: key },
    update: { configValue: value, description },
    create: { configKey: key, configValue: value, description },
  });

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "SYSTEM_CONFIG_UPDATED",
      entityType: "SystemConfiguration",
      entityId: key,
      newValues: JSON.stringify({ key }),
      changeDescription: `Config key "${key}" updated`,
    },
  });

  revalidatePath("/admin/config");
  return { success: true };
}

// ── STORY-087: System Monitoring ─────────────────────────────────────────────

export interface SystemHealth {
  counts: {
    totalUsers: number;
    activeStaff: number;
    externalApplicants: number;
    motorParks: number;
    massTransitCompanies: number;
    pendingInspections: number;
    pendingPayments: number;
    auditLogsToday: number;
  };
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    createdAt: Date;
    performer: string;
  }[];
}

export async function getSystemHealth(): Promise<ActionResult<SystemHealth>> {
  await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeStaff,
    externalApplicants,
    motorParks,
    massTransitCompanies,
    pendingInspections,
    pendingPayments,
    auditLogsToday,
    recentLogs,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({
      where: { role: { not: "EXTERNAL_APPLICANT" }, isActive: true },
    }),
    db.user.count({ where: { role: "EXTERNAL_APPLICANT" } }),
    db.motorPark.count(),
    db.massTransitCompany.count(),
    db.inspection.count({ where: { status: "SCHEDULED" } }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
    db.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        performedBy: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return {
    success: true,
    data: {
      counts: {
        totalUsers,
        activeStaff,
        externalApplicants,
        motorParks,
        massTransitCompanies,
        pendingInspections,
        pendingPayments,
        auditLogsToday,
      },
      recentActivity: recentLogs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        createdAt: l.createdAt,
        performer: `${l.performedBy.firstName} ${l.performedBy.lastName}`,
      })),
    },
  };
}

// ── STORY-090: Data Export ────────────────────────────────────────────────────

type ExportType =
  | "users"
  | "motor_parks"
  | "fleet_operators"
  | "payments"
  | "audit_logs";

export async function getExportData(
  exportType: ExportType,
): Promise<ActionResult<{ headers: string[]; rows: string[][] }>> {
  await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  switch (exportType) {
    case "users": {
      const rows = await db.user.findMany({
        where: { role: { not: "EXTERNAL_APPLICANT" } },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          designation: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
      return {
        success: true,
        data: {
          headers: [
            "First Name",
            "Last Name",
            "Email",
            "Role",
            "Designation",
            "Active",
            "Last Login",
            "Created",
          ],
          rows: rows.map((r) => [
            r.firstName,
            r.lastName,
            r.email,
            r.role,
            r.designation ?? "",
            r.isActive ? "Yes" : "No",
            r.lastLoginAt?.toISOString() ?? "",
            r.createdAt.toISOString(),
          ]),
        },
      };
    }

    case "motor_parks": {
      const parks = await db.motorPark.findMany({
        select: {
          businessName: true,
          transportCompanyName: true,
          locationAddress: true,
          applicationStatus: true,
          permitStatus: true,
          anssidNumber: true,
          applicant: { select: { email: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
      return {
        success: true,
        data: {
          headers: [
            "Business Name",
            "Company",
            "Address",
            "App Status",
            "Permit Status",
            "ANSSID",
            "Applicant Email",
            "Applied",
          ],
          rows: parks.map((p) => [
            p.businessName,
            p.transportCompanyName ?? "",
            p.locationAddress,
            p.applicationStatus,
            p.permitStatus ?? "",
            p.anssidNumber ?? "",
            p.applicant?.email ?? "",
            p.createdAt.toISOString(),
          ]),
        },
      };
    }

    case "fleet_operators": {
      const companies = await db.massTransitCompany.findMany({
        select: {
          companyName: true,
          asinNumber: true,
          contactEmail: true,
          applicationStatus: true,
          permitStatus: true,
          terminalLocationAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
      return {
        success: true,
        data: {
          headers: [
            "Company Name",
            "ASIN",
            "Contact Email",
            "App Status",
            "Permit Status",
            "Address",
            "Registered",
          ],
          rows: companies.map((c) => [
            c.companyName,
            c.asinNumber ?? "",
            c.contactEmail ?? "",
            c.applicationStatus,
            c.permitStatus ?? "",
            c.terminalLocationAddress ?? "",
            c.createdAt.toISOString(),
          ]),
        },
      };
    }

    case "payments": {
      const payments = await db.payment.findMany({
        select: {
          payerEmail: true,
          payerAsinNumber: true,
          amount: true,
          paymentType: true,
          linkedEntityType: true,
          status: true,
          initiatedAt: true,
          completedAt: true,
          receipt: { select: { receiptNumber: true } },
        },
        orderBy: { initiatedAt: "asc" },
      });
      return {
        success: true,
        data: {
          headers: [
            "Payer Email",
            "ASIN",
            "Amount (NGN)",
            "Type",
            "Entity",
            "Status",
            "Receipt",
            "Initiated",
            "Completed",
          ],
          rows: payments.map((p) => [
            p.payerEmail,
            p.payerAsinNumber ?? "",
            (p.amount / 100).toFixed(2),
            p.paymentType,
            p.linkedEntityType,
            p.status,
            p.receipt?.receiptNumber ?? "",
            p.initiatedAt?.toISOString() ?? "",
            p.completedAt?.toISOString() ?? "",
          ]),
        },
      };
    }

    case "audit_logs": {
      const logs = await db.auditLog.findMany({
        include: {
          performedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      return {
        success: true,
        data: {
          headers: [
            "Action",
            "Entity Type",
            "Entity ID",
            "Description",
            "IP Address",
            "Performed By",
            "Timestamp",
          ],
          rows: logs.map((l) => [
            l.action,
            l.entityType,
            l.entityId,
            l.changeDescription ?? "",
            l.ipAddress ?? "",
            `${l.performedBy.firstName} ${l.performedBy.lastName} (${l.performedBy.email})`,
            l.createdAt.toISOString(),
          ]),
        },
      };
    }

    default:
      return { success: false, error: "Unknown export type" };
  }
}
