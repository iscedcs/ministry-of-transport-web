/**
 * Data fix — TRACAS fleet numbering corrections (insert-and-shift).
 *
 * THE PROBLEM
 * Vehicles were onboarded as GOVERNMENT_OWNED (taking FT numbers) when they
 * should have been private. Because the LV counter never saw them, every
 * private vehicle onboarded afterwards slid DOWN one position to fill the gap
 * each missing vehicle left behind.
 *
 * So this is not a swap. The slot each vehicle should occupy is already held
 * by whoever moved down into it. Correcting it means re-inserting each vehicle
 * at its rightful position and shifting everything from that point onward UP
 * by one — the same way the sequence would have run had the mistake never
 * happened.
 *
 * THE ALGORITHM
 *   1. Take the current LV vehicles in ascending numeric order.
 *   2. Reserve the target positions for the corrected vehicles.
 *   3. Fill every remaining position, in ascending order, with the existing
 *      vehicles in their current relative order.
 *
 * `fleetNumber` is @unique, so a direct renumber collides mid-flight. The
 * rename runs in two phases inside one transaction: every affected row is
 * parked on a temporary value, then given its final number.
 *
 * DRY RUN BY DEFAULT. Nothing is written unless you pass --apply.
 *
 *   npx tsx fix-fleet-numbering.ts            # show the plan, change nothing
 *   npx tsx fix-fleet-numbering.ts --apply    # execute it
 */

import "dotenv/config";
import { Prisma } from "@prisma/client";
import { db } from "./lib/db";

// ── Configure here ──────────────────────────────────────────────────────────

interface Correction {
  registrationNumber: string;
  /** The LV position this vehicle should occupy, from the issued paperwork. */
  targetPosition: number;
  targetOwnership?: "GOVERNMENT_OWNED" | "INDIVIDUAL" | "COLLABORATIVE";
}

const CORRECTIONS: Correction[] = [
  { registrationNumber: "AAH294XB", targetPosition: 50, targetOwnership: "INDIVIDUAL" },
  { registrationNumber: "YEN71GP", targetPosition: 55, targetOwnership: "INDIVIDUAL" },
  { registrationNumber: "UMZ638XB", targetPosition: 63, targetOwnership: "INDIVIDUAL" },
];

const PREFIX = "LV";

// ── Helpers ─────────────────────────────────────────────────────────────────

const APPLY = process.argv.includes("--apply");

const fleetNo = (n: number) => `${PREFIX}${n.toString().padStart(3, "0")}`;

const positionOf = (fleet: string): number | null => {
  const upper = (fleet ?? "").toUpperCase();
  if (!upper.startsWith(PREFIX)) return null;
  const n = parseInt(upper.slice(PREFIX.length), 10);
  return isNaN(n) ? null : n;
};

async function loadVehicles() {
  return db.tracasVehicle.findMany({
    select: {
      id: true,
      registrationNumber: true,
      fleetNumber: true,
      ownershipType: true,
      ownerName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

type Vehicle = Awaited<ReturnType<typeof loadVehicles>>[number];

async function main() {
  const vehicles = await loadVehicles();
  const byReg = new Map(
    vehicles.map((v) => [v.registrationNumber.toUpperCase(), v]),
  );

  // ── Resolve the corrected vehicles ───────────────────────────────────────
  const problems: string[] = [];
  const corrected: { vehicle: Vehicle; position: number; ownership: string }[] = [];

  for (const c of CORRECTIONS) {
    const reg = c.registrationNumber.toUpperCase().trim();
    const vehicle = byReg.get(reg);
    if (!vehicle) {
      problems.push(`  ! No vehicle found with registration '${reg}'.`);
      continue;
    }
    corrected.push({
      vehicle,
      position: c.targetPosition,
      ownership: c.targetOwnership ?? vehicle.ownershipType,
    });
  }

  const correctedIds = new Set(corrected.map((c) => c.vehicle.id));

  const positions = corrected.map((c) => c.position);
  const dupePositions = positions.filter((p, i) => positions.indexOf(p) !== i);
  if (dupePositions.length > 0) {
    problems.push(
      `  ! Two corrections target the same position: ${[...new Set(dupePositions)].join(", ")}`,
    );
  }

  // ── Existing private vehicles, in their current order ────────────────────
  const existing = vehicles
    .filter((v) => !correctedIds.has(v.id))
    .filter((v) => positionOf(v.fleetNumber) !== null)
    .sort((a, b) => positionOf(a.fleetNumber)! - positionOf(b.fleetNumber)!);

  const totalSlots = existing.length + corrected.length;
  const maxTarget = Math.max(...positions, 0);

  if (maxTarget > totalSlots) {
    problems.push(
      `  ! Target position ${maxTarget} exceeds the ${totalSlots} slots available ` +
        `(${existing.length} existing + ${corrected.length} corrected). ` +
        `That would leave holes in the sequence — check the paperwork.`,
    );
  }

  if (problems.length > 0) {
    console.log("\n── PROBLEMS ─────────────────────────────────────────────────");
    problems.forEach((p) => console.log(p));
    console.log("\n  Aborting — resolve the above first.\n");
    process.exit(1);
  }

  // ── Build the final ordering ─────────────────────────────────────────────
  // Reserve the corrected positions, then pour the existing vehicles into
  // whatever slots remain, preserving their relative order.
  const slots = new Map<number, { vehicle: Vehicle; ownership: string }>();
  for (const c of corrected) {
    slots.set(c.position, { vehicle: c.vehicle, ownership: c.ownership });
  }

  let cursor = 1;
  for (const v of existing) {
    while (slots.has(cursor)) cursor++;
    slots.set(cursor, { vehicle: v, ownership: v.ownershipType });
    cursor++;
  }

  // ── Diff against current state ───────────────────────────────────────────
  const plan: {
    id: string;
    reg: string;
    fromFleet: string;
    toFleet: string;
    fromOwnership: string;
    toOwnership: string;
    isCorrected: boolean;
  }[] = [];

  for (const [position, entry] of [...slots.entries()].sort((a, b) => a[0] - b[0])) {
    const target = fleetNo(position);
    const v = entry.vehicle;
    if (v.fleetNumber === target && v.ownershipType === entry.ownership) continue;
    plan.push({
      id: v.id,
      reg: v.registrationNumber,
      fromFleet: v.fleetNumber,
      toFleet: target,
      fromOwnership: v.ownershipType,
      toOwnership: entry.ownership,
      isCorrected: correctedIds.has(v.id),
    });
  }

  console.log(
    `\n  ${vehicles.length} vehicles total · ${existing.length} already on LV numbers · ` +
      `${corrected.length} being re-inserted\n`,
  );

  console.log("── PLANNED CHANGES ──────────────────────────────────────────");
  if (plan.length === 0) {
    console.log("  Nothing to change — numbering already matches the target.\n");
    return;
  }
  for (const p of plan) {
    const marker = p.isCorrected ? " ←" : "  ";
    const ownershipNote =
      p.fromOwnership !== p.toOwnership
        ? `   [${p.fromOwnership} → ${p.toOwnership}]`
        : "";
    console.log(
      `${marker} ${p.reg.padEnd(14)} ${p.fromFleet.padEnd(7)} → ${p.toFleet.padEnd(7)}${ownershipNote}`,
    );
  }
  console.log(
    `\n  ${plan.length} row(s) change. Rows marked ← are the corrected vehicles; ` +
      `the rest shift up to make room.`,
  );

  // Guard: final numbers must be unique among themselves.
  const targets = plan.map((p) => p.toFleet);
  const dupes = targets.filter((t, i) => targets.indexOf(t) !== i);
  if (dupes.length > 0) {
    console.error(
      `\n  ABORT — target numbers collide: ${[...new Set(dupes)].join(", ")}\n`,
    );
    process.exit(1);
  }

  // Report what is left on FT numbers.
  const remainingGov = vehicles
    .filter((v) => !correctedIds.has(v.id))
    .filter((v) => v.fleetNumber.toUpperCase().startsWith("FT"));
  console.log(
    `\n  ${remainingGov.length} vehicle(s) remain on FT numbers` +
      (remainingGov.length
        ? `: ${remainingGov.map((v) => v.fleetNumber).join(", ")}`
        : " — the next government onboarding will start at FT001."),
  );

  if (!APPLY) {
    console.log("\n  DRY RUN — nothing written. Re-run with --apply to execute.\n");
    return;
  }

  console.log(`\n  Applying ${plan.length} change(s)...`);

  // Each phase is ONE statement rather than one per row. Doing 2N sequential
  // round trips to Neon blew past the interactive-transaction budget; batching
  // makes it two queries and keeps the whole thing comfortably atomic.
  await db.$transaction(
    async (tx) => {
      const ids = plan.map((p) => p.id);

      // Phase 1 — park every affected row on a temporary value. Deriving it
      // from the primary key guarantees uniqueness without a second lookup.
      await tx.$executeRaw`
        UPDATE "TracasVehicle"
        SET "fleetNumber" = '__MIG_' || "id"
        WHERE "id" IN (${Prisma.join(ids)})
      `;

      // Phase 2 — write the final numbers and ownership in a single pass.
      const rows = Prisma.join(
        plan.map((p) => Prisma.sql`(${p.id}, ${p.toFleet}, ${p.toOwnership})`),
      );
      await tx.$executeRaw`
        UPDATE "TracasVehicle" AS t
        SET "fleetNumber" = v.fleet, "ownershipType" = v.own
        FROM (VALUES ${rows}) AS v(id, fleet, own)
        WHERE t."id" = v.id
      `;
    },
    // Generous ceiling: the work is now two statements, but network latency to
    // Neon is variable and a half-applied renumber is far worse than a slow one.
    { timeout: 120_000, maxWait: 15_000 },
  );

  console.log("  Done.\n");

  const after = await loadVehicles();
  const stuck = after.filter((v) => v.fleetNumber.startsWith("__MIG_"));
  if (stuck.length > 0) {
    console.error(
      `  WARNING: ${stuck.length} row(s) left on a temporary fleet number.\n`,
    );
  }

  console.log("── FINAL STATE ──────────────────────────────────────────────");
  for (const v of [...after].sort((a, b) =>
    a.fleetNumber.localeCompare(b.fleetNumber),
  )) {
    console.log(
      `  ${v.fleetNumber.padEnd(7)} ${v.registrationNumber.padEnd(14)} ${v.ownershipType}`,
    );
  }
  console.log();
}

main()
  .catch((e) => {
    console.error("\n  FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect().catch(() => {});
  });
