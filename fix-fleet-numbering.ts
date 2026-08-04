/**
 * One-off data fix — TRACAS fleet numbering.
 *
 * Two vehicles were onboarded as GOVERNMENT_OWNED (receiving FT001 / FT002)
 * when they should have been private, carrying the LV001 / LV002 numbers they
 * were already issued off-platform. Everything currently numbered LV must
 * therefore shift up to make room.
 *
 * `TracasVehicle.fleetNumber` is @unique, so the numbers cannot simply be
 * reassigned — moving LV001 to LV003 collides with the existing LV003 while
 * both rows are live. The rename runs in two phases inside one transaction:
 * every affected row is first parked on a temporary value, then given its
 * final number.
 *
 * DRY RUN BY DEFAULT. Nothing is written unless you pass --apply.
 *
 *   npx tsx fix-fleet-numbering.ts            # show the plan, change nothing
 *   npx tsx fix-fleet-numbering.ts --apply    # execute it
 */

import "dotenv/config";
import { db } from "./lib/db";

// ── Configure here ──────────────────────────────────────────────────────────

/**
 * Registration numbers of the two vehicles to move from GOVERNMENT_OWNED to
 * private, IN THE ORDER THEY SHOULD RECEIVE LV001, LV002.
 */
const VEHICLES_TO_CONVERT: string[] = [
  "ABN437YP", // currently FT001 → LV001
  "KPP402YT", // currently FT002 → LV002
];

/** Ownership type they should end up on. */
const TARGET_OWNERSHIP = "INDIVIDUAL"; // or "COLLABORATIVE"

// ── Helpers ─────────────────────────────────────────────────────────────────

const APPLY = process.argv.includes("--apply");
const COMPACT_FT = process.argv.includes("--compact-ft");

const PRIVATE_PREFIX = "LV";
const GOV_PREFIX = "FT";

const fleetNo = (prefix: string, n: number) =>
  `${prefix}${n.toString().padStart(3, "0")}`;

/** Numeric part of a fleet number, or null when it doesn't match the prefix. */
const numOf = (fleet: string | null, prefix: string): number | null => {
  if (!fleet) return null;
  const upper = fleet.toUpperCase();
  if (!upper.startsWith(prefix)) return null;
  const n = parseInt(upper.slice(prefix.length), 10);
  return isNaN(n) ? null : n;
};

async function main() {
  if (VEHICLES_TO_CONVERT.length === 0) {
    console.error(
      "\n  Nothing to do — fill in VEHICLES_TO_CONVERT at the top of this file\n" +
        "  with the registration numbers of the two vehicles, in the order they\n" +
        "  should receive LV001 and LV002.\n",
    );
    printCurrentState(await loadVehicles());
    process.exit(1);
  }

  const vehicles = await loadVehicles();
  printCurrentState(vehicles);

  // ── Resolve the vehicles being converted ─────────────────────────────────
  const converting = VEHICLES_TO_CONVERT.map((reg) => {
    const match = vehicles.find(
      (v) => v.registrationNumber.toUpperCase() === reg.toUpperCase().trim(),
    );
    if (!match) {
      throw new Error(`No TRACAS vehicle found with registration '${reg}'.`);
    }
    return match;
  });

  for (const v of converting) {
    if (v.ownershipType !== "GOVERNMENT_OWNED") {
      console.warn(
        `  ! ${v.registrationNumber} is already '${v.ownershipType}', not GOVERNMENT_OWNED.`,
      );
    }
  }

  const convertingIds = new Set(converting.map((v) => v.id));

  // ── Build the target LV ordering ─────────────────────────────────────────
  // Converted vehicles take the front (LV001, LV002...), then every existing
  // private vehicle follows in its current numeric order, shifted up.
  const existingPrivate = vehicles
    .filter((v) => !convertingIds.has(v.id))
    .filter((v) => numOf(v.fleetNumber, PRIVATE_PREFIX) !== null)
    .sort(
      (a, b) =>
        numOf(a.fleetNumber, PRIVATE_PREFIX)! -
        numOf(b.fleetNumber, PRIVATE_PREFIX)!,
    );

  const privateOrder = [...converting, ...existingPrivate];

  const plan: {
    id: string;
    reg: string;
    fromFleet: string;
    toFleet: string;
    fromOwnership: string;
    toOwnership: string;
  }[] = [];

  privateOrder.forEach((v, i) => {
    const target = fleetNo(PRIVATE_PREFIX, i + 1);
    const targetOwnership = convertingIds.has(v.id)
      ? TARGET_OWNERSHIP
      : v.ownershipType;
    if (v.fleetNumber !== target || v.ownershipType !== targetOwnership) {
      plan.push({
        id: v.id,
        reg: v.registrationNumber,
        fromFleet: v.fleetNumber,
        toFleet: target,
        fromOwnership: v.ownershipType,
        toOwnership: targetOwnership,
      });
    }
  });

  // ── Optionally close the gap left in the FT sequence ─────────────────────
  const remainingGov = vehicles
    .filter((v) => !convertingIds.has(v.id))
    .filter((v) => numOf(v.fleetNumber, GOV_PREFIX) !== null)
    .sort(
      (a, b) =>
        numOf(a.fleetNumber, GOV_PREFIX)! - numOf(b.fleetNumber, GOV_PREFIX)!,
    );

  if (COMPACT_FT) {
    remainingGov.forEach((v, i) => {
      const target = fleetNo(GOV_PREFIX, i + 1);
      if (v.fleetNumber !== target) {
        plan.push({
          id: v.id,
          reg: v.registrationNumber,
          fromFleet: v.fleetNumber,
          toFleet: target,
          fromOwnership: v.ownershipType,
          toOwnership: v.ownershipType,
        });
      }
    });
  } else if (remainingGov.length > 0) {
    const lowest = numOf(remainingGov[0].fleetNumber, GOV_PREFIX)!;
    if (lowest > 1) {
      console.log(
        `\n  Note: the government sequence will start at ${remainingGov[0].fleetNumber} ` +
          `(FT001–FT${(lowest - 1).toString().padStart(3, "0")} freed up).\n` +
          `  Re-run with --compact-ft to renumber them from FT001.`,
      );
    }
  }

  // ── Show the plan ────────────────────────────────────────────────────────
  console.log("\n── PLANNED CHANGES ──────────────────────────────────────────");
  if (plan.length === 0) {
    console.log("  Nothing to change — numbering already matches the target.");
    return;
  }
  for (const p of plan) {
    const ownershipNote =
      p.fromOwnership !== p.toOwnership
        ? `   [${p.fromOwnership} → ${p.toOwnership}]`
        : "";
    console.log(
      `  ${p.reg.padEnd(14)} ${p.fromFleet.padEnd(7)} → ${p.toFleet.padEnd(7)}${ownershipNote}`,
    );
  }

  // Guard: the final numbers must be unique among themselves.
  const targets = plan.map((p) => p.toFleet);
  const dupes = targets.filter((t, i) => targets.indexOf(t) !== i);
  if (dupes.length > 0) {
    throw new Error(`Target fleet numbers collide: ${[...new Set(dupes)].join(", ")}`);
  }

  if (!APPLY) {
    console.log(
      "\n  DRY RUN — nothing written. Re-run with --apply to execute.\n",
    );
    return;
  }

  // ── Apply: two-phase rename in a single transaction ──────────────────────
  console.log("\n  Applying...");
  await db.$transaction(async (tx) => {
    // Phase 1 — park every affected row on a temporary unique value so the
    // @unique constraint cannot trip while numbers are being swapped around.
    for (let i = 0; i < plan.length; i++) {
      await tx.tracasVehicle.update({
        where: { id: plan[i].id },
        data: { fleetNumber: `__MIGRATING_${i}_${Date.now()}` },
      });
    }

    // Phase 2 — write the final numbers and ownership.
    for (const p of plan) {
      await tx.tracasVehicle.update({
        where: { id: p.id },
        data: { fleetNumber: p.toFleet, ownershipType: p.toOwnership },
      });
    }
  });

  console.log("  Done.\n");
  printCurrentState(await loadVehicles());

  const stillTemp = (await loadVehicles()).filter((v) =>
    v.fleetNumber.startsWith("__MIGRATING_"),
  );
  if (stillTemp.length > 0) {
    console.error(
      `\n  WARNING: ${stillTemp.length} row(s) left on a temporary fleet number. Investigate before continuing.`,
    );
  }
}

async function loadVehicles() {
  return db.tracasVehicle.findMany({
    select: {
      id: true,
      registrationNumber: true,
      fleetNumber: true,
      ownershipType: true,
      ownerName: true,
      authorityRef: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

function printCurrentState(vehicles: Awaited<ReturnType<typeof loadVehicles>>) {
  console.log("\n── CURRENT STATE ────────────────────────────────────────────");
  console.log(
    `  ${"REG".padEnd(14)} ${"FLEET".padEnd(7)} ${"OWNERSHIP".padEnd(18)} OWNER`,
  );
  for (const v of vehicles) {
    console.log(
      `  ${v.registrationNumber.padEnd(14)} ${v.fleetNumber.padEnd(7)} ` +
        `${v.ownershipType.padEnd(18)} ${v.ownerName ?? "—"}`,
    );
  }
  console.log(`  (${vehicles.length} vehicles)`);
}

main()
  .catch((e) => {
    console.error("\n  FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect().catch(() => {});
  });
