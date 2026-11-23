"use server";

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { checkDuplicatePlateNumber } from "@/lib/plate-validation";
import {
  EMBARGO_LIFT_ROLES,
  EMBARGO_PLACE_ROLES,
  FLEET_VIEW_ROLES,
} from "@/lib/fleet-roles";
import {
  embargoDisplay,
  embargoKey,
  findActiveEmbargo,
} from "@/lib/tracas-embargo";

/**
 * TRACAS embargo pool.
 *
 * Vehicles caught operating without being onboarded are put here and cannot be
 * registered until the sanction is lifted. This is for vehicles NOT on the
 * system; a vehicle that is already registered is refused here, and an
 * embargoed vehicle is never counted in the fleet because it is never in it.
 *
 * The block itself lives in onboardTracasVehicle / updateTracasVehicle
 * (app/actions/tracas.ts) — this file manages the pool.
 */

const PAGE_SIZE = 25;
const MAX = { reason: 1000, location: 500, sanction: 500, note: 500 };

type Result<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string };

export interface PlaceEmbargoInput {
  plateNumber: string;
  reason: string;
  locationFound: string;
  /** Penalty or sanction required before it can be lifted. Optional. */
  sanction?: string;
}

export async function placeEmbargo(
  input: PlaceEmbargoInput,
): Promise<Result<{ id: string }>> {
  try {
    const authz = await authorize(EMBARGO_PLACE_ROLES);
    if (!authz.ok) return { success: false, error: authz.error };

    const plate = embargoDisplay(input.plateNumber);
    const key = embargoKey(input.plateNumber);
    if (key.length < 3) {
      return { success: false, error: "Enter the vehicle's plate number." };
    }
    const reason = input.reason?.trim() ?? "";
    const locationFound = input.locationFound?.trim() ?? "";
    const sanction = input.sanction?.trim() || null;
    if (!reason) {
      return { success: false, error: "State the reason for the embargo." };
    }
    if (!locationFound) {
      return { success: false, error: "State where the vehicle was found." };
    }
    if (
      reason.length > MAX.reason ||
      locationFound.length > MAX.location ||
      (sanction?.length ?? 0) > MAX.sanction
    ) {
      return {
        success: false,
        error: "One of the fields is too long. Shorten it and try again.",
      };
    }

    // Embargo is for vehicles that are not on the system yet.
    const registered = await checkDuplicatePlateNumber(plate);
    if (registered.isTaken) {
      return {
        success: false,
        error: `${plate} is already registered (${registered.module ?? "on the platform"}), so it cannot go in the embargo pool. That is only for vehicles that are not on the system yet.`,
      };
    }

    const already = await findActiveEmbargo(plate);
    if (already) {
      return { success: false, error: `${plate} is already in the embargo pool.` };
    }

    let id: string;
    try {
      const row = await db.tracasEmbargo.create({
        data: {
          plateNumber: plate,
          plateKey: key,
          activeKey: key,
          reason,
          locationFound,
          sanction,
          placedByUserId: authz.session.userId,
        },
        select: { id: true },
      });
      id = row.id;
    } catch (e) {
      // Two people embargoing the same plate at once: the unique key decides.
      if ((e as { code?: string }).code === "P2002") {
        return { success: false, error: `${plate} is already in the embargo pool.` };
      }
      throw e;
    }

    await recordAudit({
      action: "TRACAS_EMBARGO_PLACED",
      entityType: "TRACAS_EMBARGO",
      entityId: id,
      changeDescription: `Embargoed ${plate}: ${reason} (found at ${locationFound})`,
      newValues: { plateNumber: plate, reason, locationFound, sanction },
    });

    revalidatePath("/tracas-embargo");
    return { success: true, id };
  } catch (error) {
    console.error("[PlaceEmbargo Error]", error);
    return { success: false, error: "Could not place the embargo. Try again." };
  }
}

export async function liftEmbargo(id: string, note: string): Promise<Result> {
  try {
    const authz = await authorize(EMBARGO_LIFT_ROLES);
    if (!authz.ok) {
      return {
        success: false,
        error: "Only the System Admin, Admin or TRACAS MD can lift an embargo.",
      };
    }
    const liftNote = note?.trim() ?? "";
    if (!liftNote) {
      return {
        success: false,
        error:
          "Say why it is being lifted, for example the penalty receipt reference.",
      };
    }
    if (liftNote.length > MAX.note) {
      return { success: false, error: "The note is too long. Shorten it." };
    }

    // Conditional update: lifting twice, or two people at once, lifts it once.
    const lifted = await db.tracasEmbargo.updateMany({
      where: { id, status: "ACTIVE" },
      data: {
        status: "LIFTED",
        activeKey: null,
        liftedByUserId: authz.session.userId,
        liftedAt: new Date(),
        liftNote,
      },
    });
    if (lifted.count === 0) {
      return {
        success: false,
        error: "That embargo is not active (already lifted, or not found).",
      };
    }

    const row = await db.tracasEmbargo.findUnique({
      where: { id },
      select: { plateNumber: true },
    });
    await recordAudit({
      action: "TRACAS_EMBARGO_LIFTED",
      entityType: "TRACAS_EMBARGO",
      entityId: id,
      changeDescription: `Lifted embargo on ${row?.plateNumber ?? id}: ${liftNote}`,
      newValues: { liftNote },
    });

    revalidatePath("/tracas-embargo");
    return { success: true };
  } catch (error) {
    console.error("[LiftEmbargo Error]", error);
    return { success: false, error: "Could not lift the embargo. Try again." };
  }
}

export interface PlateEmbargoCheck {
  embargoed: boolean;
  plateNumber?: string;
  reason?: string;
  locationFound?: string;
  sanction?: string | null;
  placedAt?: string;
}

/**
 * Live check for the plate field on the registration form: is this plate in the
 * embargo pool? Lets the enumerator see the red flag the moment they type it,
 * not only when they submit. (Submitting is blocked on the server regardless.)
 */
export async function checkPlateEmbargo(
  plate: string,
): Promise<PlateEmbargoCheck> {
  const authz = await authorize(FLEET_VIEW_ROLES);
  if (!authz.ok) return { embargoed: false };
  const hit = await findActiveEmbargo(plate);
  if (!hit) return { embargoed: false };
  return {
    embargoed: true,
    plateNumber: hit.plateNumber,
    reason: hit.reason,
    locationFound: hit.locationFound,
    sanction: hit.sanction,
    placedAt: hit.placedAt.toISOString(),
  };
}

export interface EmbargoRow {
  id: string;
  plateNumber: string;
  reason: string;
  locationFound: string;
  sanction: string | null;
  status: "ACTIVE" | "LIFTED";
  placedAt: string;
  placedBy: string;
  liftedAt: string | null;
  liftedBy: string | null;
  liftNote: string | null;
}

export async function listEmbargoes(params?: {
  status?: "ACTIVE" | "LIFTED" | "ALL";
  search?: string;
  page?: number;
}): Promise<
  Result<{
    rows: EmbargoRow[];
    total: number;
    page: number;
    totalPages: number;
    activeCount: number;
  }>
> {
  const authz = await authorize(FLEET_VIEW_ROLES);
  if (!authz.ok) return { success: false, error: authz.error };

  const status = params?.status ?? "ACTIVE";
  const page = Math.max(1, params?.page ?? 1);
  const q = (params?.search ?? "").trim();
  const qKey = embargoKey(q);

  const where = {
    ...(status === "ALL" ? {} : { status }),
    ...(q
      ? {
          OR: [
            ...(qKey ? [{ plateKey: { contains: qKey } }] : []),
            { reason: { contains: q, mode: "insensitive" as const } },
            { locationFound: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows, activeCount] = await Promise.all([
    db.tracasEmbargo.count({ where }),
    db.tracasEmbargo.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.tracasEmbargo.count({ where: { status: "ACTIVE" } }),
  ]);

  const userIds = [
    ...new Set(
      rows
        .flatMap((r) => [r.placedByUserId, r.liftedByUserId])
        .filter(Boolean) as string[],
    ),
  ];
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const nameOf = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : null;
  };

  return {
    success: true,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    activeCount,
    rows: rows.map((r) => ({
      id: r.id,
      plateNumber: r.plateNumber,
      reason: r.reason,
      locationFound: r.locationFound,
      sanction: r.sanction,
      status: r.status as "ACTIVE" | "LIFTED",
      placedAt: r.placedAt.toISOString(),
      placedBy: nameOf(r.placedByUserId) ?? "Unknown",
      liftedAt: r.liftedAt?.toISOString() ?? null,
      liftedBy: nameOf(r.liftedByUserId),
      liftNote: r.liftNote,
    })),
  };
}
