import "dotenv/config";
import { db } from "../lib/db";
import {
  buildEnforcementCode,
  enforcementCodePrefix,
  serialOf,
} from "../lib/enforcement-code";

/**
 * Give already-issued Special Enforcement Unit (ex Park Monitor) ID cards their
 * MOT/<town>/SEU./NNN number.
 *
 * Cards issued before this existed have no stored code and show the old
 * PM-XXXXXX reference. New cards get a code when they are issued; this fills in
 * the earlier ones, oldest first, so the serial order follows the issue order.
 *
 *   npx tsx scripts/backfill-enforcement-codes.ts            # dry run
 *   npx tsx scripts/backfill-enforcement-codes.ts --apply    # assign
 *
 * SAFE TO RE-RUN. A card that already has a code keeps it — a number printed on
 * a vest is never changed.
 */

const APPLY = process.argv.includes("--apply");

async function main() {
  const missing = await db.parkMonitorApplication.findMany({
    where: { idCardIssued: true, idCode: null },
    orderBy: [{ idCardIssuedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, firstName: true, surname: true, communityTown: true, lga: true },
  });

  console.log(`${missing.length} issued card(s) without an ID number.\n`);
  if (missing.length === 0) return;

  const existing = await db.parkMonitorApplication.findMany({
    where: { idCode: { not: null } },
    select: { idCode: true },
  });
  const codes = existing.map((e) => e.idCode as string);

  // Next serial per town prefix, continuing after any codes already assigned.
  const next = new Map<string, number>();
  const nextSerial = (prefix: string) => {
    if (!next.has(prefix)) {
      next.set(
        prefix,
        codes.reduce((max, c) => Math.max(max, serialOf(c, prefix)), 0) + 1,
      );
    }
    const n = next.get(prefix)!;
    next.set(prefix, n + 1);
    return n;
  };

  for (const app of missing) {
    const town = app.communityTown || app.lga;
    const code = buildEnforcementCode(town, nextSerial(enforcementCodePrefix(town)));
    console.log(`${APPLY ? "assign" : "would assign"}  ${code}  ${app.firstName} ${app.surname}`);
    if (APPLY) {
      await db.parkMonitorApplication.update({
        where: { id: app.id },
        data: { idCode: code },
      });
    }
  }

  if (!APPLY) console.log("\nDry run — nothing written. Re-run with --apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
