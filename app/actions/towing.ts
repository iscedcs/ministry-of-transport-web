"use server";

/**
 * Towing Van registration — Server Actions.
 *
 * Registration and permit issuance are two separate steps:
 *   1. registerTowingVan — vehicle + operator + optional assistant + LGA.
 *      Anyone with write access (field enumerator, admin) can do this.
 *   2. issueTowingPermit — generates the Anambra State Towing Permit number
 *      and marks the record issued. Restricted to the Commissioner (or PS,
 *      or System Admin) — this is the step that puts the Commissioner's
 *      signature on the document.
 *
 * Permit number format: ANS-MOT-TOW/<LGA>/<serial padded to 3>, scoped to the
 * LGA so each area restarts at 001, mirroring the CVR VIN pattern.
 */

import { db } from "@/lib/db";
import { authorize, requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  TOWING_BASE_WRITE_ROLES,
  TOWING_BASE_VIEW_ROLES,
  TOWING_ISSUE_ROLES,
} from "@/lib/towing-roles";
import type { TowingVanStatus } from "@prisma/client";

export interface TowingVanInput {
  plateNumber: string;
  chassisNumber?: string;
  vehicleType: string;
  make?: string;
  model?: string;
  color?: string;
  stickerNumber?: string;
  operatorName: string;
  operatorPhone: string;
  operatorAddress?: string;
  operatorGender?: string;
  hasAssistant: boolean;
  assistantName?: string;
  assistantPhone?: string;
  associationMember: boolean;
  associationName?: string;
  lgaId?: string;
}

function blank(v: string | undefined | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/** Register a towing van. Does not issue the permit — see issueTowingPermit. */
export async function registerTowingVan(
  input: TowingVanInput,
): Promise<{ success: true; towingVanId: string } | { success: false; error: string }> {
  const authz = await authorize(TOWING_BASE_WRITE_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!input.plateNumber?.trim()) {
    return { success: false, error: "Plate number is required." };
  }
  if (!input.vehicleType?.trim()) {
    return { success: false, error: "Vehicle type is required." };
  }
  if (!input.operatorName?.trim() || !input.operatorPhone?.trim()) {
    return { success: false, error: "The operator's name and phone number are required." };
  }
  if (input.hasAssistant && !input.assistantName?.trim()) {
    return { success: false, error: "Assistant name is required when an assistant is recorded." };
  }
  if (input.associationMember && !input.associationName?.trim()) {
    return { success: false, error: "Name the association, or clear association membership." };
  }

  const plateNumber = input.plateNumber.trim().toUpperCase();

  const existing = await db.towingVan.findUnique({
    where: { plateNumber },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "A towing van with this plate number is already registered." };
  }

  try {
    const van = await db.towingVan.create({
      data: {
        plateNumber,
        chassisNumber: blank(input.chassisNumber),
        vehicleType: input.vehicleType.trim(),
        make: blank(input.make),
        model: blank(input.model),
        color: blank(input.color),
        stickerNumber: blank(input.stickerNumber),
        operatorName: input.operatorName.trim(),
        operatorPhone: input.operatorPhone.trim(),
        operatorAddress: blank(input.operatorAddress),
        operatorGender: blank(input.operatorGender),
        hasAssistant: input.hasAssistant,
        assistantName: input.hasAssistant ? blank(input.assistantName) : null,
        assistantPhone: input.hasAssistant ? blank(input.assistantPhone) : null,
        associationMember: input.associationMember,
        associationName: input.associationMember ? blank(input.associationName) : null,
        lgaId: input.lgaId || null,
        capturedByUserId: authz.session.userId,
      },
      select: { id: true },
    });

    await recordAudit({
      action: "TOWING_VAN_REGISTERED",
      entityType: "TOWING_VAN",
      entityId: van.id,
      changeDescription: `Towing van ${plateNumber} registered — operator ${input.operatorName.trim()}`,
      newValues: { plateNumber, status: "REGISTERED" },
    });

    revalidatePath("/towing-vans");
    return { success: true, towingVanId: van.id };
  } catch (err) {
    console.error("registerTowingVan error:", err);
    return { success: false, error: "Could not register the towing van. Check the details and try again." };
  }
}

/** Correct a registration — the enumerator mistyped something, or details changed. */
export async function updateTowingVan(
  id: string,
  input: TowingVanInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const authz = await authorize(TOWING_BASE_WRITE_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!input.plateNumber?.trim()) {
    return { success: false, error: "Plate number is required." };
  }
  if (!input.vehicleType?.trim()) {
    return { success: false, error: "Vehicle type is required." };
  }
  if (!input.operatorName?.trim() || !input.operatorPhone?.trim()) {
    return { success: false, error: "The operator's name and phone number are required." };
  }
  if (input.hasAssistant && !input.assistantName?.trim()) {
    return { success: false, error: "Assistant name is required when an assistant is recorded." };
  }
  if (input.associationMember && !input.associationName?.trim()) {
    return { success: false, error: "Name the association, or clear association membership." };
  }

  const existing = await db.towingVan.findUnique({
    where: { id },
    select: { plateNumber: true },
  });
  if (!existing) return { success: false, error: "Towing van not found." };

  const plateNumber = input.plateNumber.trim().toUpperCase();

  if (plateNumber !== existing.plateNumber) {
    const clash = await db.towingVan.findUnique({
      where: { plateNumber },
      select: { id: true },
    });
    if (clash) {
      return { success: false, error: "Another towing van is already registered with this plate number." };
    }
  }

  try {
    await db.towingVan.update({
      where: { id },
      data: {
        plateNumber,
        chassisNumber: blank(input.chassisNumber),
        vehicleType: input.vehicleType.trim(),
        make: blank(input.make),
        model: blank(input.model),
        color: blank(input.color),
        stickerNumber: blank(input.stickerNumber),
        operatorName: input.operatorName.trim(),
        operatorPhone: input.operatorPhone.trim(),
        operatorAddress: blank(input.operatorAddress),
        operatorGender: blank(input.operatorGender),
        hasAssistant: input.hasAssistant,
        assistantName: input.hasAssistant ? blank(input.assistantName) : null,
        assistantPhone: input.hasAssistant ? blank(input.assistantPhone) : null,
        associationMember: input.associationMember,
        associationName: input.associationMember ? blank(input.associationName) : null,
        lgaId: input.lgaId || null,
      },
    });

    await recordAudit({
      action: "TOWING_VAN_EDITED",
      entityType: "TOWING_VAN",
      entityId: id,
      changeDescription: `Towing van ${plateNumber} details corrected`,
    });

    revalidatePath(`/towing-vans/${id}`);
    revalidatePath("/towing-vans");
    return { success: true };
  } catch (err) {
    console.error("updateTowingVan error:", err);
    return { success: false, error: "Could not save the changes." };
  }
}

/**
 * Generates the next towing permit number for the given LGA.
 * Format: ANS-MOT-TOW/<LGA abbreviation>/<serial 3-padded>,
 * e.g. ANS-MOT-TOW/AWS/001
 */
async function generateTowingPermitNumber(lgaAbbr: string): Promise<string> {
  const prefix = `ANS-MOT-TOW/${lgaAbbr}/`;
  const existing = await db.towingVan.findMany({
    where: { permitNumber: { startsWith: prefix } },
    select: { permitNumber: true },
  });

  let maxSerial = 0;
  const pattern = new RegExp(`^${prefix.replace(/[/]/g, "\\/")}(\\d+)$`);
  for (const { permitNumber } of existing) {
    if (!permitNumber) continue;
    const m = permitNumber.match(pattern);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxSerial) maxSerial = n;
    }
  }

  const serial = String(maxSerial + 1).padStart(3, "0");
  return `${prefix}${serial}`;
}

/**
 * Issue the Anambra State Towing Permit. Restricted to the Commissioner (or
 * PS / System Admin) — registration alone does not produce a permit.
 */
export async function issueTowingPermit(
  towingVanId: string,
): Promise<{ success: true; permitNumber: string } | { success: false; error: string }> {
  const authz = await authorize(TOWING_ISSUE_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  const van = await db.towingVan.findUnique({
    where: { id: towingVanId },
    select: {
      status: true,
      plateNumber: true,
      lga: { select: { name: true, abbreviation: true } },
    },
  });
  if (!van) return { success: false, error: "Towing van not found." };

  if (van.status === "PERMIT_ISSUED") {
    return { success: false, error: "This van already has a permit." };
  }
  if (!van.lga) {
    return { success: false, error: "Set the area of operation (LGA) before issuing the permit." };
  }

  const permitNumber = await generateTowingPermitNumber(van.lga.abbreviation || van.lga.name);
  const now = new Date();

  await db.towingVan.update({
    where: { id: towingVanId },
    data: {
      status: "PERMIT_ISSUED",
      permitNumber,
      permitIssuedAt: now,
      issuedByUserId: authz.session.userId,
    },
  });

  await recordAudit({
    action: "TOWING_PERMIT_ISSUED",
    entityType: "TOWING_VAN",
    entityId: towingVanId,
    changeDescription: `Anambra State Towing Permit ${permitNumber} issued for ${van.plateNumber}`,
    newValues: { permitNumber, status: "PERMIT_ISSUED" },
  });

  revalidatePath(`/towing-vans/${towingVanId}`);
  revalidatePath("/towing-vans");
  return { success: true, permitNumber };
}

export interface TowingVanListItem {
  id: string;
  plateNumber: string;
  vehicleType: string;
  operatorName: string;
  operatorPhone: string;
  lgaName: string | null;
  status: TowingVanStatus;
  permitNumber: string | null;
  createdAt: Date;
}

export async function listTowingVans(filters?: {
  page?: number;
  search?: string;
  status?: TowingVanStatus;
}): Promise<
  | {
      success: true;
      vans: TowingVanListItem[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
      stats: { total: number; issued: number; pending: number };
    }
  | { success: false; error: string }
> {
  const authz = await authorize(TOWING_BASE_VIEW_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  const pageSize = 25;
  const page = Math.max(1, filters?.page ?? 1);

  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { plateNumber: { contains: q, mode: "insensitive" } },
      { operatorName: { contains: q, mode: "insensitive" } },
      { permitNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  const [vans, total, issued, pending] = await Promise.all([
    db.towingVan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        plateNumber: true,
        vehicleType: true,
        operatorName: true,
        operatorPhone: true,
        status: true,
        permitNumber: true,
        createdAt: true,
        lga: { select: { name: true } },
      },
    }),
    db.towingVan.count({ where }),
    db.towingVan.count({ where: { status: "PERMIT_ISSUED" } }),
    db.towingVan.count({ where: { status: "REGISTERED" } }),
  ]);

  return {
    success: true,
    vans: vans.map((v) => ({
      id: v.id,
      plateNumber: v.plateNumber,
      vehicleType: v.vehicleType,
      operatorName: v.operatorName,
      operatorPhone: v.operatorPhone,
      lgaName: v.lga?.name ?? null,
      status: v.status,
      permitNumber: v.permitNumber,
      createdAt: v.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    stats: { total, issued, pending },
  };
}

export async function getTowingVan(id: string) {
  const authz = await authorize(TOWING_BASE_VIEW_ROLES);
  if (!authz.ok) return { success: false as const, error: authz.error };

  const van = await db.towingVan.findUnique({
    where: { id },
    include: {
      lga: { select: { id: true, name: true } },
    },
  });
  if (!van) return { success: false as const, error: "Towing van not found." };

  return { success: true as const, van };
}

export async function getTowingLgas() {
  await requireAuth();
  const lgas = await db.cvrLga.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return { success: true as const, lgas };
}
