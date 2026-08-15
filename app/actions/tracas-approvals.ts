"use server";

/**
 * TRACAS Letter of Authority — approval chain.
 *
 *   Enumerator onboards  →  PENDING_VIO_APPROVAL
 *   VIO verifies         →  PENDING_MD_APPROVAL
 *   MD approves          →  PENDING_COMMISSIONER_APPROVAL   (MD signature applied)
 *   Commissioner approves→  APPROVED                        (both signatures applied)
 *   Either declines      →  DECLINED                        (returns to the enumerator)
 *
 * Only an APPROVED letter reaches the ICT printing queue. Each stage is
 * gated on the preceding one, so the Commissioner cannot sign a letter the
 * MD has not yet cleared.
 */

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { MAX_LIST_ROWS } from "@/lib/query-limits";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

/** The VIO stage is a verification gate — it produces no signature. */
const VIO_ROLES = [
  "VEHICLE_INSPECTION_OFFICER",
  "HOD_VIS",
  "SYSTEM_ADMIN",
] as const;
/** Who may act at the MD stage. System Admin included for support/recovery. */
const MD_ROLES = ["TRACAS_MD", "SYSTEM_ADMIN"] as const;
/** Who may act at the Commissioner stage. */
const COMMISSIONER_ROLES = ["COMMISSIONER", "SYSTEM_ADMIN"] as const;

type Result = { success: boolean; error?: string };

// ── VIO stage (verification, no signature) ──────────────────────────────────

export async function vioApproveLetter(vehicleId: string): Promise<Result> {
  const authz = await authorize([...VIO_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const vehicle = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
      select: { letterStatus: true, registrationNumber: true },
    });
    if (!vehicle) return { success: false, error: "Vehicle not found." };

    if (vehicle.letterStatus !== "PENDING_VIO_APPROVAL") {
      return {
        success: false,
        error: `This letter is not awaiting VIO verification (currently ${vehicle.letterStatus}).`,
      };
    }

    await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: {
        letterStatus: "PENDING_MD_APPROVAL",
        vioApprovedAt: new Date(),
        vioApprovedByUserId: authz.session.userId,
        declinedAt: null,
        declinedByUserId: null,
        declinedAtStage: null,
        declineReason: null,
      },
    });

    await recordAudit({
      action: "TRACAS_LETTER_VIO_APPROVED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: `VIO verified Letter of Authority for ${vehicle.registrationNumber}; forwarded to the MD`,
      oldValues: { letterStatus: vehicle.letterStatus },
      newValues: { letterStatus: "PENDING_MD_APPROVAL" },
    });

    revalidatePath("/tracas");
    revalidatePath("/tracas-approvals");
    return { success: true };
  } catch (error: unknown) {
    console.error("vioApproveLetter failed:", error);
    return { success: false, error: "Failed to verify letter." };
  }
}

export async function vioDeclineLetter(
  vehicleId: string,
  reason: string,
): Promise<Result> {
  const authz = await authorize([...VIO_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!reason?.trim()) {
    return { success: false, error: "A reason is required when declining." };
  }

  try {
    const vehicle = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
      select: { letterStatus: true, registrationNumber: true },
    });
    if (!vehicle) return { success: false, error: "Vehicle not found." };

    if (vehicle.letterStatus !== "PENDING_VIO_APPROVAL") {
      return {
        success: false,
        error: `This letter is not awaiting VIO verification (currently ${vehicle.letterStatus}).`,
      };
    }

    await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: {
        letterStatus: "DECLINED",
        declinedAt: new Date(),
        declinedByUserId: authz.session.userId,
        declinedAtStage: "VIO",
        declineReason: reason.trim(),
      },
    });

    await recordAudit({
      action: "TRACAS_LETTER_VIO_DECLINED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: `VIO declined Letter of Authority for ${vehicle.registrationNumber}: ${reason.trim()}`,
      oldValues: { letterStatus: vehicle.letterStatus },
      newValues: { letterStatus: "DECLINED", stage: "VIO" },
    });

    revalidatePath("/tracas");
    revalidatePath("/tracas-approvals");
    return { success: true };
  } catch (error: unknown) {
    console.error("vioDeclineLetter failed:", error);
    return { success: false, error: "Failed to decline letter." };
  }
}

// ── MD stage (signature) ────────────────────────────────────────────────────

export async function mdApproveLetter(vehicleId: string): Promise<Result> {
  const authz = await authorize([...MD_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const vehicle = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
      select: { letterStatus: true, registrationNumber: true },
    });
    if (!vehicle) return { success: false, error: "Vehicle not found." };

    if (vehicle.letterStatus !== "PENDING_MD_APPROVAL") {
      return {
        success: false,
        error: `This letter is not awaiting MD approval (currently ${vehicle.letterStatus}).`,
      };
    }

    await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: {
        letterStatus: "PENDING_COMMISSIONER_APPROVAL",
        mdApprovedAt: new Date(),
        mdApprovedByUserId: authz.session.userId,
        // Clear any earlier decline so the history reads cleanly on re-submit.
        declinedAt: null,
        declinedByUserId: null,
        declinedAtStage: null,
        declineReason: null,
      },
    });

    await recordAudit({
      action: "TRACAS_LETTER_MD_APPROVED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: `MD approved Letter of Authority for ${vehicle.registrationNumber}; forwarded to Commissioner`,
      oldValues: { letterStatus: vehicle.letterStatus },
      newValues: { letterStatus: "PENDING_COMMISSIONER_APPROVAL" },
    });

    revalidatePath("/tracas");
    revalidatePath("/tracas-approvals");
    return { success: true };
  } catch (error: unknown) {
    console.error("mdApproveLetter failed:", error);
    return { success: false, error: "Failed to approve letter." };
  }
}

export async function mdDeclineLetter(
  vehicleId: string,
  reason: string,
): Promise<Result> {
  const authz = await authorize([...MD_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!reason?.trim()) {
    return { success: false, error: "A reason is required when declining." };
  }

  try {
    const vehicle = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
      select: { letterStatus: true, registrationNumber: true },
    });
    if (!vehicle) return { success: false, error: "Vehicle not found." };

    if (vehicle.letterStatus !== "PENDING_MD_APPROVAL") {
      return {
        success: false,
        error: `This letter is not awaiting MD approval (currently ${vehicle.letterStatus}).`,
      };
    }

    await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: {
        letterStatus: "DECLINED",
        declinedAt: new Date(),
        declinedByUserId: authz.session.userId,
        declinedAtStage: "MD",
        declineReason: reason.trim(),
      },
    });

    await recordAudit({
      action: "TRACAS_LETTER_MD_DECLINED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: `MD declined Letter of Authority for ${vehicle.registrationNumber}: ${reason.trim()}`,
      oldValues: { letterStatus: vehicle.letterStatus },
      newValues: { letterStatus: "DECLINED", stage: "MD" },
    });

    revalidatePath("/tracas");
    revalidatePath("/tracas-approvals");
    return { success: true };
  } catch (error: unknown) {
    console.error("mdDeclineLetter failed:", error);
    return { success: false, error: "Failed to decline letter." };
  }
}

// ── Commissioner stage ──────────────────────────────────────────────────────

export async function commissionerApproveLetter(
  vehicleId: string,
): Promise<Result> {
  const authz = await authorize([...COMMISSIONER_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const vehicle = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
      select: { letterStatus: true, registrationNumber: true },
    });
    if (!vehicle) return { success: false, error: "Vehicle not found." };

    // The MD signature must already be on the letter.
    if (vehicle.letterStatus !== "PENDING_COMMISSIONER_APPROVAL") {
      return {
        success: false,
        error:
          vehicle.letterStatus === "PENDING_VIO_APPROVAL"
            ? "This letter must be verified by the VIO, then approved by the TRACAS MD, first."
            : vehicle.letterStatus === "PENDING_MD_APPROVAL"
              ? "This letter must be approved by the TRACAS MD first."
            : `This letter is not awaiting Commissioner approval (currently ${vehicle.letterStatus}).`,
      };
    }

    await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: {
        letterStatus: "APPROVED",
        commissionerApprovedAt: new Date(),
        commissionerApprovedByUserId: authz.session.userId,
      },
    });

    await recordAudit({
      action: "TRACAS_LETTER_COMMISSIONER_APPROVED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: `Commissioner approved Letter of Authority for ${vehicle.registrationNumber}; released to ICT printing`,
      oldValues: { letterStatus: vehicle.letterStatus },
      newValues: { letterStatus: "APPROVED" },
    });

    revalidatePath("/tracas");
    revalidatePath("/tracas-approvals");
    revalidatePath("/ict-printing");
    return { success: true };
  } catch (error: unknown) {
    console.error("commissionerApproveLetter failed:", error);
    return { success: false, error: "Failed to approve letter." };
  }
}

export async function commissionerDeclineLetter(
  vehicleId: string,
  reason: string,
): Promise<Result> {
  const authz = await authorize([...COMMISSIONER_ROLES]);
  if (!authz.ok) return { success: false, error: authz.error };

  if (!reason?.trim()) {
    return { success: false, error: "A reason is required when declining." };
  }

  try {
    const vehicle = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
      select: { letterStatus: true, registrationNumber: true },
    });
    if (!vehicle) return { success: false, error: "Vehicle not found." };

    if (vehicle.letterStatus !== "PENDING_COMMISSIONER_APPROVAL") {
      return {
        success: false,
        error: `This letter is not awaiting Commissioner approval (currently ${vehicle.letterStatus}).`,
      };
    }

    await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: {
        letterStatus: "DECLINED",
        declinedAt: new Date(),
        declinedByUserId: authz.session.userId,
        declinedAtStage: "COMMISSIONER",
        declineReason: reason.trim(),
        // The MD's clearance no longer stands once the Commissioner rejects.
        mdApprovedAt: null,
        mdApprovedByUserId: null,
      },
    });

    await recordAudit({
      action: "TRACAS_LETTER_COMMISSIONER_DECLINED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: `Commissioner declined Letter of Authority for ${vehicle.registrationNumber}: ${reason.trim()}`,
      oldValues: { letterStatus: vehicle.letterStatus },
      newValues: { letterStatus: "DECLINED", stage: "COMMISSIONER" },
    });

    revalidatePath("/tracas");
    revalidatePath("/tracas-approvals");
    return { success: true };
  } catch (error: unknown) {
    console.error("commissionerDeclineLetter failed:", error);
    return { success: false, error: "Failed to decline letter." };
  }
}

// ── Resubmission ────────────────────────────────────────────────────────────

/**
 * Return a declined letter to the MD's desk after the enumerator has
 * corrected the record.
 */
export async function resubmitLetterForApproval(
  vehicleId: string,
): Promise<Result> {
  const authz = await authorize([
    "ENUMERATOR",
    "SYSTEM_ADMIN",
    "TRACAS_MD",
    "HOD_TRANSPORT_OPS",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const vehicle = await db.tracasVehicle.findUnique({
      where: { id: vehicleId },
      select: { letterStatus: true, registrationNumber: true },
    });
    if (!vehicle) return { success: false, error: "Vehicle not found." };

    if (vehicle.letterStatus !== "DECLINED") {
      return {
        success: false,
        error: "Only a declined letter can be resubmitted.",
      };
    }

    await db.tracasVehicle.update({
      where: { id: vehicleId },
      data: {
        letterStatus: "PENDING_VIO_APPROVAL",
        vioApprovedAt: null,
        vioApprovedByUserId: null,
        declinedAt: null,
        declinedByUserId: null,
        declinedAtStage: null,
        declineReason: null,
        mdApprovedAt: null,
        mdApprovedByUserId: null,
        commissionerApprovedAt: null,
        commissionerApprovedByUserId: null,
      },
    });

    await recordAudit({
      action: "TRACAS_LETTER_RESUBMITTED",
      entityType: "TRACAS_VEHICLE",
      entityId: vehicleId,
      changeDescription: `Letter of Authority for ${vehicle.registrationNumber} resubmitted to the VIO`,
      oldValues: { letterStatus: "DECLINED" },
      newValues: { letterStatus: "PENDING_VIO_APPROVAL" },
    });

    revalidatePath("/tracas");
    revalidatePath("/tracas-approvals");
    return { success: true };
  } catch (error: unknown) {
    console.error("resubmitLetterForApproval failed:", error);
    return { success: false, error: "Failed to resubmit letter." };
  }
}

// ── Queue ───────────────────────────────────────────────────────────────────

export interface ApprovalQueueVehicle {
  id: string;
  registrationNumber: string;
  fleetNumber: string;
  authorityRef: string;
  category: string;
  makeModel: string | null;
  ownershipType: string;
  enrollmentType: string;
  ownerName: string | null;
  assignedRoute: string | null;
  letterStatus: string;
  mdApprovedAt: Date | null;
  commissionerApprovedAt: Date | null;
  declinedAtStage: string | null;
  declineReason: string | null;
  createdAt: Date;
  assignedDriver: { fullName: string; phoneNumber: string } | null;
}

export interface ApprovalQueueData {
  /** Stage this viewer acts on, or null when they are only observing. */
  stage: "VIO" | "MD" | "COMMISSIONER" | null;
  pending: ApprovalQueueVehicle[];
  counts: {
    pendingVio: number;
    pendingMd: number;
    pendingCommissioner: number;
    approved: number;
    declined: number;
  };
  recentlyDeclined: ApprovalQueueVehicle[];
}

const QUEUE_SELECT = {
  id: true,
  registrationNumber: true,
  fleetNumber: true,
  authorityRef: true,
  category: true,
  makeModel: true,
  ownershipType: true,
  enrollmentType: true,
  ownerName: true,
  assignedRoute: true,
  letterStatus: true,
  mdApprovedAt: true,
  commissionerApprovedAt: true,
  declinedAtStage: true,
  declineReason: true,
  createdAt: true,
  assignedDriver: { select: { fullName: true, phoneNumber: true } },
} as const;

/**
 * The letters awaiting the viewer, plus counts across the whole chain so the
 * MD can see the full TRACAS picture rather than only her own step.
 */
export async function getLetterApprovalQueue(): Promise<
  { success: true; data: ApprovalQueueData } | { success: false; error: string }
> {
  const authz = await authorize([
    "VEHICLE_INSPECTION_OFFICER",
    "HOD_VIS",
    "TRACAS_MD",
    "COMMISSIONER",
    "SYSTEM_ADMIN",
    // Read-only oversight. The approve/decline actions in this file keep their
    // own narrower role lists and do NOT include ADMIN.
    "ADMIN",
    "PERMANENT_SECRETARY",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const role = authz.session.role;
    // System Admin and PS observe the chain; they do not own a stage.
    const stage: "VIO" | "MD" | "COMMISSIONER" | null =
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
      pendingVio,
      pendingMd,
      pendingCommissioner,
      approved,
      declined,
      recentlyDeclined,
    ] =
      await Promise.all([
        db.tracasVehicle.findMany({
          where: pendingStatus
            ? { letterStatus: pendingStatus }
            : {
                letterStatus: {
                  in: [
                    "PENDING_VIO_APPROVAL",
                    "PENDING_MD_APPROVAL",
                    "PENDING_COMMISSIONER_APPROVAL",
                  ],
                },
              },
          orderBy: { createdAt: "asc" },
          select: QUEUE_SELECT,
          take: MAX_LIST_ROWS,
        }),
        db.tracasVehicle.count({
          where: { letterStatus: "PENDING_VIO_APPROVAL" },
        }),
        db.tracasVehicle.count({ where: { letterStatus: "PENDING_MD_APPROVAL" } }),
        db.tracasVehicle.count({
          where: { letterStatus: "PENDING_COMMISSIONER_APPROVAL" },
        }),
        db.tracasVehicle.count({ where: { letterStatus: "APPROVED" } }),
        db.tracasVehicle.count({ where: { letterStatus: "DECLINED" } }),
        db.tracasVehicle.findMany({
          where: { letterStatus: "DECLINED" },
          orderBy: { declinedAt: "desc" },
          take: 10,
          select: QUEUE_SELECT,
        }),
      ]);

    return {
      success: true,
      data: {
        stage,
        pending,
        counts: {
          pendingVio,
          pendingMd,
          pendingCommissioner,
          approved,
          declined,
        },
        recentlyDeclined,
      },
    };
  } catch (error: unknown) {
    console.error("getLetterApprovalQueue failed:", error);
    return { success: false, error: "Failed to load the approval queue." };
  }
}

// ── MD dashboard overview ───────────────────────────────────────────────────

export interface TracasOverview {
  fleet: {
    total: number;
    active: number;
    government: number;
    individual: number;
    collaborative: number;
    existing: number;
    newJoiners: number;
    withoutDriver: number;
    withoutSticker: number;
  };
  drivers: {
    total: number;
    active: number;
    assigned: number;
    unassigned: number;
  };
  stickers: { total: number; assigned: number; available: number };
  activity: {
    id: string;
    action: string;
    description: string | null;
    createdAt: Date;
    actor: string;
  }[];
}

/**
 * Fleet-wide TRACAS figures for the MD's dashboard. Her remit is the whole
 * company, not only the letters sitting on her desk, so this covers vehicles,
 * drivers, sticker inventory and recent activity across the module.
 */
export async function getTracasOverview(): Promise<
  { success: true; data: TracasOverview } | { success: false; error: string }
> {
  const authz = await authorize([
    "TRACAS_MD",
    "COMMISSIONER",
    "SYSTEM_ADMIN",
    "PERMANENT_SECRETARY",
    "HOD_TRANSPORT_OPS",
  ]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const [
      total,
      active,
      government,
      individual,
      collaborative,
      newJoiners,
      withoutDriver,
      withoutSticker,
      driversTotal,
      driversActive,
      driversAssigned,
      stickersTotal,
      stickersAssigned,
      activity,
    ] = await Promise.all([
      db.tracasVehicle.count(),
      db.tracasVehicle.count({ where: { status: "ACTIVE" } }),
      db.tracasVehicle.count({ where: { ownershipType: "GOVERNMENT_OWNED" } }),
      db.tracasVehicle.count({ where: { ownershipType: "INDIVIDUAL" } }),
      db.tracasVehicle.count({ where: { ownershipType: "COLLABORATIVE" } }),
      db.tracasVehicle.count({ where: { enrollmentType: "NEW_JOINER" } }),
      db.tracasVehicle.count({ where: { assignedDriverId: null } }),
      db.tracasVehicle.count({ where: { sticker: { is: null } } }),
      db.tracasDriver.count(),
      db.tracasDriver.count({ where: { status: "ACTIVE" } }),
      db.tracasDriver.count({ where: { vehicles: { some: {} } } }),
      db.tracasSticker.count(),
      db.tracasSticker.count({ where: { isAssigned: true } }),
      db.auditLog.findMany({
        where: {
          entityType: {
            in: ["TRACAS_VEHICLE", "TRACAS_DRIVER", "TRACAS_STICKER"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          action: true,
          changeDescription: true,
          createdAt: true,
          performedBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        fleet: {
          total,
          active,
          government,
          individual,
          collaborative,
          existing: total - newJoiners,
          newJoiners,
          withoutDriver,
          withoutSticker,
        },
        drivers: {
          total: driversTotal,
          active: driversActive,
          assigned: driversAssigned,
          unassigned: driversTotal - driversAssigned,
        },
        stickers: {
          total: stickersTotal,
          assigned: stickersAssigned,
          available: stickersTotal - stickersAssigned,
        },
        activity: activity.map((a) => ({
          id: a.id,
          action: a.action,
          description: a.changeDescription,
          createdAt: a.createdAt,
          actor: a.performedBy
            ? `${a.performedBy.firstName} ${a.performedBy.lastName}`
            : "—",
        })),
      },
    };
  } catch (error: unknown) {
    console.error("getTracasOverview failed:", error);
    return { success: false, error: "Failed to load the TRACAS overview." };
  }
}
