/**
 * Data fix — insert the VIO stage into the Letter of Authority chain.
 *
 * The chain was MD → Commissioner → ICT. It is now
 * VIO → MD → Commissioner → ICT.
 *
 * ONLY letters that have not yet been touched by the MD move backwards to the
 * new first stage. Anything the MD has already signed stays exactly where it
 * is — a signed letter must never be pulled back for re-verification:
 *
 *   PENDING_MD_APPROVAL           → PENDING_VIO_APPROVAL   (never signed)
 *   PENDING_COMMISSIONER_APPROVAL → untouched              (MD has signed)
 *   APPROVED                      → untouched              (both signed)
 *   DECLINED                      → untouched              (resubmit routes it)
 *
 * DRY RUN BY DEFAULT. Nothing is written unless you pass --apply.
 *
 *   npx tsx migrate-letters-to-vio.ts
 *   npx tsx migrate-letters-to-vio.ts --apply
 */

import "dotenv/config";
import { db } from "./lib/db";

const APPLY = process.argv.includes("--apply");

async function main() {
  const byStatus = await db.tracasVehicle.groupBy({
    by: ["letterStatus"],
    _count: { _all: true },
  });

  console.log("\n── CURRENT LETTER STATUSES ──────────────────────────────────");
  for (const row of byStatus) {
    console.log(`  ${String(row.letterStatus).padEnd(32)} ${row._count._all}`);
  }

  // Only letters still sitting on the MD's desk unsigned are eligible.
  const eligible = await db.tracasVehicle.findMany({
    where: { letterStatus: "PENDING_MD_APPROVAL", mdApprovedAt: null },
    select: { id: true, registrationNumber: true, fleetNumber: true },
    orderBy: { fleetNumber: "asc" },
  });

  // Belt and braces: a row marked PENDING_MD_APPROVAL that somehow carries an
  // mdApprovedAt has been signed and must be left alone.
  const signedButPending = await db.tracasVehicle.count({
    where: { letterStatus: "PENDING_MD_APPROVAL", mdApprovedAt: { not: null } },
  });

  const protectedCount = await db.tracasVehicle.count({
    where: {
      letterStatus: {
        in: ["PENDING_COMMISSIONER_APPROVAL", "APPROVED"],
      },
    },
  });

  console.log("\n── PLAN ─────────────────────────────────────────────────────");
  console.log(
    `  ${eligible.length} letter(s) move PENDING_MD_APPROVAL → PENDING_VIO_APPROVAL`,
  );
  for (const v of eligible) {
    console.log(`    ${v.fleetNumber.padEnd(8)} ${v.registrationNumber}`);
  }
  console.log(
    `\n  ${protectedCount} letter(s) already signed by the MD — left untouched.`,
  );
  if (signedButPending > 0) {
    console.log(
      `  ${signedButPending} letter(s) marked pending but carrying an MD signature — left untouched.`,
    );
  }

  if (eligible.length === 0) {
    console.log("\n  Nothing to migrate.\n");
    return;
  }

  if (!APPLY) {
    console.log("\n  DRY RUN — nothing written. Re-run with --apply.\n");
    return;
  }

  const result = await db.tracasVehicle.updateMany({
    where: { letterStatus: "PENDING_MD_APPROVAL", mdApprovedAt: null },
    data: { letterStatus: "PENDING_VIO_APPROVAL" },
  });

  console.log(`\n  Done — ${result.count} letter(s) moved to the VIO.\n`);

  const after = await db.tracasVehicle.groupBy({
    by: ["letterStatus"],
    _count: { _all: true },
  });
  console.log("── FINAL LETTER STATUSES ────────────────────────────────────");
  for (const row of after) {
    console.log(`  ${String(row.letterStatus).padEnd(32)} ${row._count._all}`);
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
