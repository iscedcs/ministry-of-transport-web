"use server";

/**
 * TRACAS driver ID card — approval chain.
 *
 *   Enumerator enrols       →  PENDING_VIO_APPROVAL
 *   VIO verifies            →  PENDING_MD_APPROVAL
 *   MD approves             →  PENDING_COMMISSIONER_APPROVAL   (MD signature)
 *   Commissioner approves   →  APPROVED                        (both signatures)
 *   Any stage declines      →  DECLINED                        (back to enumerator)
 *
 * The VIO stage is a verification gate — the officer confirms the driver's
 * particulars, but does not sign the card. Only two signatures appear on it.
 *
 * Only an APPROVED card reaches the ICT printing queue.
 */

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { recordAudit } from "@/lib/audit";

const VIO_ROLES = ["VEHICLE_INSPECTION_OFFICER", "HOD_VIS", "SYSTEM_ADMIN"] as const;
const MD_ROLES = ["TRACAS_MD", "SYSTEM_ADMIN"] as const;
const COMMISSIONER_ROLES = ["COMMISSIONER", "SYSTEM_ADMIN"] as const;

type Result = { success: boolean; error?: string };

/** Shared transition helper — every stage follows the same shape. */
async function advance(
  driverId: string,
  opts: {
    roles: readonly UserRole[];
    from: string;
    to: string;
    action: string;
    stageLabel: string;
    data: Record<string, unknown>;
    revalidateIct?: boolean;
  },
): Promise<Result> {
  const authz = await authorize([...opts.roles]);
  if (!authz.ok) {
    return {
      success: false,
      error: `Only the ${opts.stageLabel} can action this stage.`,
    };
  }

  try {
    const driver = await db.tracasDriver.findUnique({
      where: { id: driverId },
      select: { idCardStatus: true, fullName: true },
    });
    if (!driver) return { success: false, error: "Driver not found." };

    if (driver.idCardStatus !== opts.from) {
      return {
        success: false,
        error: `This ID card is not awaiting ${opts.stageLabel} (currently ${driver.idCardStatus}).`,
      };
    }

    await db.tracasDriver.update({
      where: { id: driverId },
      data: {
        idCardStatus: opts.to as never,
        // Clear any earlier decline so a resubmitted card reads cleanly.
        idDeclinedAt: null,
        idDeclinedByUserId: null,
        idDeclinedAtStage: null,
        idDeclineReason: null,
        ...opts.data,
      },
    });

    await recordAudit({
      action: opts.action,
      entityType: "TRACAS_DRIVER",
      entityId: driverId,
      changeDescription: `${opts.stageLabel} approved ID card for ${driver.fullName}`,
      oldValues: { idCardStatus: opts.from },
      newValues: { idCardStatus: opts.to },
    });

    revalidatePath("/tracas");
    revalidatePath("/id-card-approvals");
    if (opts.revalidateIct) revalidatePath("/ict-printing");
    return { success: true };
  } catch (error: unknown) {
    console.error(`${opts.action} failed:`, error);
    return { success: false, error: "Failed to update the ID card." };
  }
}

async function decline(
  driverId: string,
  reason: string,
  opts: { roles: readonly UserRole[]; from: string; stage: string; action: string },
): Promise<Result> {
  const authz = await authorize([...opts.roles]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!reason?.trim()) {
    return { success: false, error: "A reason is required when declining." };
  }

  try {
    const driver = await db.tracasDriver.findUnique({
      where: { id: driverId },
      select: { idCardStatus: true, fullName: true },
    });
    if (!driver) return { success: false, error: "Driver not found." };

    if (driver.idCardStatus !== opts.from) {
      return {
        success: false,
        error: `This ID card is not at the ${opts.stage} stage (currently ${driver.idCardStatus}).`,
      };
    }

    await db.tracasDriver.update({
      where: { id: driverId },
      data: {
        idCardStatus: "DECLINED",
        idDeclinedAt: new Date(),
        idDeclinedByUserId: authz.session.userId,
        idDeclinedAtStage: opts.stage,
        idDeclineReason: reason.trim(),
      },
    });

    await recordAudit({
      action: opts.action,
      entityType: "TRACAS_DRIVER",
      entityId: driverId,
      changeDescription: `${opts.stage} declined ID card for ${driver.fullName}: ${reason.trim()}`,
      oldValues: { idCardStatus: opts.from },
      newValues: { idCardStatus: "DECLINED", stage: opts.stage },
    });

    revalidatePath("/tracas");
    revalidatePath("/id-card-approvals");
    return { success: true };
  } catch (error: unknown) {
    console.error(`${opts.action} failed:`, error);
    return { success: false, error: "Failed to decline the ID card." };
  }
}

// ── Stage 1: VIO verification (no signature) ────────────────────────────────

export async function vioApproveIdCard(driverId: string): Promise<Result> {
  const authz = await authorize([...VIO_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };
  return advance(driverId, {
    roles: VIO_ROLES,
    from: "PENDING_VIO_APPROVAL",
    to: "PENDING_MD_APPROVAL",
    action: "TRACAS_ID_CARD_VIO_APPROVED",
    stageLabel: "Vehicle Inspection Officer",
    data: {
      vioApprovedAt: new Date(),
      vioApprovedByUserId: authz.session.userId,
    },
  });
}

export async function vioDeclineIdCard(
  driverId: string,
  reason: string,
): Promise<Result> {
  return decline(driverId, reason, {
    roles: VIO_ROLES,
    from: "PENDING_VIO_APPROVAL",
    stage: "VIO",
    action: "TRACAS_ID_CARD_VIO_DECLINED",
  });
}

// ── Stage 2: MD signature ───────────────────────────────────────────────────

export async function mdApproveIdCard(driverId: string): Promise<Result> {
  const authz = await authorize([...MD_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };
  return advance(driverId, {
    roles: MD_ROLES,
    from: "PENDING_MD_APPROVAL",
    to: "PENDING_COMMISSIONER_APPROVAL",
    action: "TRACAS_ID_CARD_MD_APPROVED",
    stageLabel: "Ag. MD/CEO",
    data: {
      idMdApprovedAt: new Date(),
      idMdApprovedByUserId: authz.session.userId,
    },
  });
}

export async function mdDeclineIdCard(
  driverId: string,
  reason: string,
): Promise<Result> {
  return decline(driverId, reason, {
    roles: MD_ROLES,
    from: "PENDING_MD_APPROVAL",
    stage: "MD",
    action: "TRACAS_ID_CARD_MD_DECLINED",
  });
}

// ── Stage 3: Commissioner signature ─────────────────────────────────────────

export async function commissionerApproveIdCard(
  driverId: string,
): Promise<Result> {
  const authz = await authorize([...COMMISSIONER_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };
  return advance(driverId, {
    roles: COMMISSIONER_ROLES,
    from: "PENDING_COMMISSIONER_APPROVAL",
    to: "APPROVED",
    action: "TRACAS_ID_CARD_COMMISSIONER_APPROVED",
    stageLabel: "Commissioner",
    data: {
      idCommissionerApprovedAt: new Date(),
      idCommissionerApprovedByUserId: authz.session.userId,
    },
    revalidateIct: true,
  });
}

export async function commissionerDeclineIdCard(
  driverId: string,
  reason: string,
): Promise<Result> {
  return decline(driverId, reason, {
    roles: COMMISSIONER_ROLES,
    from: "PENDING_COMMISSIONER_APPROVAL",
    stage: "COMMISSIONER",
    action: "TRACAS_ID_CARD_COMMISSIONER_DECLINED",
  });
}

// ── Resubmission ────────────────────────────────────────────────────────────

export async function resubmitIdCard(driverId: string): Promise<Result> {
  const authz = await authorize([
    "ENUMERATOR",
    "SYSTEM_ADMIN",
    "TRACAS_MD",
    "VEHICLE_INSPECTION_OFFICER",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const driver = await db.tracasDriver.findUnique({
      where: { id: driverId },
      select: { idCardStatus: true, fullName: true },
    });
    if (!driver) return { success: false, error: "Driver not found." };
    if (driver.idCardStatus !== "DECLINED") {
      return { success: false, error: "Only a declined card can be resubmitted." };
    }

    await db.tracasDriver.update({
      where: { id: driverId },
      data: {
        idCardStatus: "PENDING_VIO_APPROVAL",
        idDeclinedAt: null,
        idDeclinedByUserId: null,
        idDeclinedAtStage: null,
        idDeclineReason: null,
        vioApprovedAt: null,
        vioApprovedByUserId: null,
        idMdApprovedAt: null,
        idMdApprovedByUserId: null,
        idCommissionerApprovedAt: null,
        idCommissionerApprovedByUserId: null,
      },
    });

    await recordAudit({
      action: "TRACAS_ID_CARD_RESUBMITTED",
      entityType: "TRACAS_DRIVER",
      entityId: driverId,
      changeDescription: `ID card for ${driver.fullName} resubmitted to the VIO`,
      newValues: { idCardStatus: "PENDING_VIO_APPROVAL" },
    });

    revalidatePath("/id-card-approvals");
    return { success: true };
  } catch (error: unknown) {
    console.error("resubmitIdCard failed:", error);
    return { success: false, error: "Failed to resubmit the ID card." };
  }
}

// ── Queue ───────────────────────────────────────────────────────────────────

export interface IdCardQueueDriver {
  id: string;
  fullName: string;
  phoneNumber: string;
  photoUrl: string | null;
  securityCode: string | null;
  licenseNumber: string | null;
  licenseExpiryDate: Date | null;
  operatorAssociation: string | null;
  idCardStatus: string;
  idDeclinedAtStage: string | null;
  idDeclineReason: string | null;
  createdAt: Date;
  vehicles: { registrationNumber: string; fleetNumber: string }[];
}

export interface IdCardQueueData {
  stage: "VIO" | "MD" | "COMMISSIONER" | null;
  pending: IdCardQueueDriver[];
  recentlyDeclined: IdCardQueueDriver[];
  counts: {
    pendingVio: number;
    pendingMd: number;
    pendingCommissioner: number;
    approved: number;
    declined: number;
  };
}

const QUEUE_SELECT = {
  id: true,
  fullName: true,
  phoneNumber: true,
  photoUrl: true,
  securityCode: true,
  licenseNumber: true,
  licenseExpiryDate: true,
  operatorAssociation: true,
  idCardStatus: true,
  idDeclinedAtStage: true,
  idDeclineReason: true,
  createdAt: true,
  vehicles: { select: { registrationNumber: true, fleetNumber: true } },
} as const;

export async function getIdCardQueue(): Promise<
  { success: true; data: IdCardQueueData } | { success: false; error: string }
> {
  const authz = await authorize([
    "VEHICLE_INSPECTION_OFFICER",
    "HOD_VIS",
    "TRACAS_MD",
    "COMMISSIONER",
    "SYSTEM_ADMIN",
    "PERMANENT_SECRETARY",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const role = authz.session.role;
    const stage: IdCardQueueData["stage"] =
      role === "VEHICLE_INSPECTION_OFFICER" || role === "HOD_VIS"
        ? "VIO"
        : role === "TRACAS_MD"
          ? "MD"
          : role === "COMMISSIONER"
            ? "COMMISSIONER"
            : null;

    const pendingStatus =
      stage === "VIO"
        ? "PENDING_VIO_APPROVAL"
        : stage === "MD"
          ? "PENDING_MD_APPROVAL"
          : stage === "COMMISSIONER"
            ? "PENDING_COMMISSIONER_APPROVAL"
            : undefined;

    const [
      pending,
      recentlyDeclined,
      pendingVio,
      pendingMd,
      pendingCommissioner,
      approved,
      declined,
    ] = await Promise.all([
      db.tracasDriver.findMany({
        where: pendingStatus
          ? { idCardStatus: pendingStatus as never }
          : {
              idCardStatus: {
                in: [
                  "PENDING_VIO_APPROVAL",
                  "PENDING_MD_APPROVAL",
                  "PENDING_COMMISSIONER_APPROVAL",
                ] as never,
              },
            },
        orderBy: { createdAt: "asc" },
        select: QUEUE_SELECT,
      }),
      db.tracasDriver.findMany({
        where: { idCardStatus: "DECLINED" },
        orderBy: { idDeclinedAt: "desc" },
        take: 10,
        select: QUEUE_SELECT,
      }),
      db.tracasDriver.count({ where: { idCardStatus: "PENDING_VIO_APPROVAL" } }),
      db.tracasDriver.count({ where: { idCardStatus: "PENDING_MD_APPROVAL" } }),
      db.tracasDriver.count({
        where: { idCardStatus: "PENDING_COMMISSIONER_APPROVAL" },
      }),
      db.tracasDriver.count({ where: { idCardStatus: "APPROVED" } }),
      db.tracasDriver.count({ where: { idCardStatus: "DECLINED" } }),
    ]);

    return {
      success: true,
      data: {
        stage,
        pending,
        recentlyDeclined,
        counts: {
          pendingVio,
          pendingMd,
          pendingCommissioner,
          approved,
          declined,
        },
      },
    };
  } catch (error: unknown) {
    console.error("getIdCardQueue failed:", error);
    return { success: false, error: "Failed to load the ID card queue." };
  }
}
