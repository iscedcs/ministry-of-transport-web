"use server";

/**
 * Fleet number administration.
 *
 * Renumbering a TRACAS vehicle by hand has caused repeated damage: a fleet
 * number is `@unique`, so a naive update collides, and "move this vehicle to
 * LV097" can mean three different things depending on whether LV097 is free.
 *
 * This gives the System Admin the operation itself, with the collision handled
 * explicitly and a preview of every row that will move before anything is
 * written:
 *
 *   DIRECT  — the target is free; one row changes.
 *   SWAP    — the target is taken; the two vehicles exchange numbers.
 *   INSERT  — the target is taken; the occupant and everything above it shift
 *             up by one, so the sequence stays contiguous.
 *
 * INSERT is the one that bit us before. It is written as a two-phase rename —
 * every affected row is parked on a temporary value first — because shifting
 * in place would collide with the unique index partway through.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getNumberSetting } from "@/lib/system-config";

const ADMIN = ["SYSTEM_ADMIN"] as const;

export type RenumberMode = "DIRECT" | "SWAP" | "INSERT";

export interface PrefixReport {
  prefix: string;
  count: number;
  min: number;
  max: number;
  /** What the generator would hand out next. */
  next: string;
  /** Numbers below the maximum that nothing occupies. */
  gaps: number[];
  /** Set in config; 0 means "continue from the highest in use". */
  overrideNext: number;
}

export interface RenumberChange {
  vehicleId: string;
  registrationNumber: string;
  from: string;
  to: string;
}

const parse = (fleet: string) => {
  const m = /^([A-Za-z]+)(\d+)$/.exec((fleet ?? "").trim());
  return m ? { prefix: m[1].toUpperCase(), num: Number(m[2]) } : null;
};

const format = (prefix: string, num: number, padding: number) =>
  `${prefix}${String(num).padStart(padding, "0")}`;

// ── Report ──────────────────────────────────────────────────────────────────

export async function getFleetNumberingReport(): Promise<{
  success: boolean;
  error?: string;
  data?: { prefixes: PrefixReport[]; padding: number; unparseable: string[] };
}> {
  const authz = await authorize([...ADMIN]);
  if (!authz.ok) return { success: false, error: authz.error };

  const [vehicles, padding, lvOverride, ftOverride] = await Promise.all([
    db.tracasVehicle.findMany({ select: { fleetNumber: true } }),
    getNumberSetting("tracas.fleet.padding"),
    getNumberSetting("tracas.fleet.lv.nextNumber"),
    getNumberSetting("tracas.fleet.ft.nextNumber"),
  ]);

  const buckets = new Map<string, number[]>();
  const unparseable: string[] = [];

  for (const v of vehicles) {
    const p = parse(v.fleetNumber);
    if (!p) {
      if (v.fleetNumber) unparseable.push(v.fleetNumber);
      continue;
    }
    const list = buckets.get(p.prefix) ?? [];
    list.push(p.num);
    buckets.set(p.prefix, list);
  }

  const overrideFor = (prefix: string) =>
    prefix === "LV" ? lvOverride : prefix === "FT" ? ftOverride : 0;

  const prefixes: PrefixReport[] = [...buckets.entries()]
    .map(([prefix, nums]) => {
      nums.sort((a, b) => a - b);
      const max = nums[nums.length - 1];
      const used = new Set(nums);
      const gaps: number[] = [];
      for (let i = 1; i <= max; i++) if (!used.has(i)) gaps.push(i);

      const override = overrideFor(prefix);
      const next = override > 0 ? override : max + 1;

      return {
        prefix,
        count: nums.length,
        min: nums[0],
        max,
        next: format(prefix, next, padding || 3),
        gaps,
        overrideNext: override,
      };
    })
    .sort((a, b) => b.count - a.count);

  return { success: true, data: { prefixes, padding: padding || 3, unparseable } };
}

// ── Preview ─────────────────────────────────────────────────────────────────

/**
 * Works out exactly which rows a renumber would touch. The admin sees this
 * before anything is written — an INSERT can move dozens of vehicles whose
 * letters of authority are already printed.
 */
export async function previewFleetRenumber(
  vehicleId: string,
  targetFleetNumber: string,
  mode: RenumberMode,
): Promise<{
  success: boolean;
  error?: string;
  data?: { changes: RenumberChange[]; mode: RenumberMode; warning?: string };
}> {
  const authz = await authorize([...ADMIN]);
  if (!authz.ok) return { success: false, error: authz.error };

  const padding = (await getNumberSetting("tracas.fleet.padding")) || 3;

  const target = parse(targetFleetNumber);
  if (!target) {
    return {
      success: false,
      error: "Enter a fleet number like LV097 — letters followed by digits.",
    };
  }
  const normalisedTarget = format(target.prefix, target.num, padding);

  const vehicle = await db.tracasVehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, fleetNumber: true, registrationNumber: true },
  });
  if (!vehicle) return { success: false, error: "Vehicle not found." };

  if (vehicle.fleetNumber === normalisedTarget) {
    return { success: false, error: `That vehicle is already ${normalisedTarget}.` };
  }

  const occupant = await db.tracasVehicle.findUnique({
    where: { fleetNumber: normalisedTarget },
    select: { id: true, fleetNumber: true, registrationNumber: true },
  });

  // DIRECT is the only sensible mode when nothing is in the way.
  if (!occupant) {
    return {
      success: true,
      data: {
        mode: "DIRECT",
        changes: [
          {
            vehicleId: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            from: vehicle.fleetNumber,
            to: normalisedTarget,
          },
        ],
      },
    };
  }

  if (mode === "DIRECT") {
    return {
      success: false,
      error: `${normalisedTarget} already belongs to ${occupant.registrationNumber}. Choose Swap or Insert instead.`,
    };
  }

  if (mode === "SWAP") {
    return {
      success: true,
      data: {
        mode: "SWAP",
        changes: [
          {
            vehicleId: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            from: vehicle.fleetNumber,
            to: normalisedTarget,
          },
          {
            vehicleId: occupant.id,
            registrationNumber: occupant.registrationNumber,
            from: occupant.fleetNumber,
            to: vehicle.fleetNumber,
          },
        ],
      },
    };
  }

  // INSERT — the occupant and everything above it move up one.
  const affected = await db.tracasVehicle.findMany({
    where: { fleetNumber: { startsWith: target.prefix } },
    select: { id: true, fleetNumber: true, registrationNumber: true },
  });

  const shifted = affected
    .map((v) => ({ ...v, parsed: parse(v.fleetNumber) }))
    .filter(
      (v): v is typeof v & { parsed: { prefix: string; num: number } } =>
        v.parsed !== null &&
        v.parsed.prefix === target.prefix &&
        v.parsed.num >= target.num &&
        v.id !== vehicle.id,
    )
    .sort((a, b) => b.parsed.num - a.parsed.num);

  const changes: RenumberChange[] = [
    {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      from: vehicle.fleetNumber,
      to: normalisedTarget,
    },
    ...shifted.map((v) => ({
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      from: v.fleetNumber,
      to: format(target.prefix, v.parsed.num + 1, padding),
    })),
  ];

  return {
    success: true,
    data: {
      mode: "INSERT",
      changes,
      warning:
        shifted.length > 0
          ? `${shifted.length} other vehicle${shifted.length === 1 ? "" : "s"} will be renumbered. Any letter of authority already printed for them shows the old number and must be reprinted.`
          : undefined,
    },
  };
}

// ── Apply ───────────────────────────────────────────────────────────────────

export async function applyFleetRenumber(
  vehicleId: string,
  targetFleetNumber: string,
  mode: RenumberMode,
): Promise<{ success: boolean; error?: string; data?: { moved: number } }> {
  const authz = await authorize([...ADMIN]);
  if (!authz.ok) return { success: false, error: authz.error };

  const preview = await previewFleetRenumber(vehicleId, targetFleetNumber, mode);
  if (!preview.success || !preview.data) {
    return { success: false, error: preview.error };
  }

  const { changes, mode: resolvedMode } = preview.data;

  // Two-phase rename. fleetNumber is unique, so shifting a contiguous block in
  // place collides partway through no matter which order it is done in. Park
  // every affected row on a value nothing else can hold, then write the finals.
  //
  // Each phase is ONE statement. Issuing 2 x N sequential updates inside an
  // interactive transaction overruns Prisma's 5s default long before a
  // 48-vehicle shift finishes (P2028), and the whole move then rolls back.
  const stamp = Date.now().toString(36);

  const bulkRename = (pairs: { id: string; fleet: string }[]) =>
    Prisma.sql`
      UPDATE "TracasVehicle" AS t
      SET "fleetNumber" = v.fleet
      FROM (VALUES ${Prisma.join(
        pairs.map((p) => Prisma.sql`(${p.id}::text, ${p.fleet}::text)`),
      )}) AS v(id, fleet)
      WHERE t."id" = v.id`;

  try {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw(
          bulkRename(
            changes.map((c, i) => ({ id: c.vehicleId, fleet: `TMP-${stamp}-${i}` })),
          ),
        );
        await tx.$executeRaw(
          bulkRename(changes.map((c) => ({ id: c.vehicleId, fleet: c.to }))),
        );
      },
      // Generous headroom: the two statements are fast, but a cross-region
      // connection makes the round trips the dominant cost.
      { timeout: 120_000, maxWait: 15_000 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        success: false,
        error:
          err.code === "P2028"
            ? "The database transaction timed out and was rolled back. No vehicle was changed."
            : `Renumber failed and was rolled back (${err.code}). No vehicle was changed.`,
      };
    }
    console.error("applyFleetRenumber failed:", err);
    return {
      success: false,
      error: "Renumber failed and was rolled back. No vehicle was changed.",
    };
  }

  await recordAudit({
    action: "TRACAS_FLEET_RENUMBERED",
    entityType: "TRACAS_VEHICLE",
    entityId: vehicleId,
    changeDescription: `${resolvedMode} renumber — ${changes.length} vehicle(s) moved: ${changes
      .slice(0, 6)
      .map((c) => `${c.registrationNumber} ${c.from}→${c.to}`)
      .join("; ")}${changes.length > 6 ? `; +${changes.length - 6} more` : ""}`,
    oldValues: Object.fromEntries(changes.map((c) => [c.registrationNumber, c.from])),
    newValues: Object.fromEntries(changes.map((c) => [c.registrationNumber, c.to])),
  });

  revalidatePath("/tracas");
  revalidatePath("/admin/config");
  return { success: true, data: { moved: changes.length } };
}
