import "dotenv/config";
import { db } from "../lib/db";
import {
  buildEnforcementCode,
  enforcementCodePrefix,
  serialOf,
  suggestedOperationLga,
} from "../lib/enforcement-code";

/**
 * Give already-issued Special Enforcement Unit (ex Park Monitor) ID cards their
 * Local Government of Operation and MOT/<LGA>/SEU./NNN number.
 *
 * Cards issued before these existed have no stored code and show the old
 * PM-XXXXXX reference. New cards get both when they are issued; this fills in
 * the earlier ones, oldest first, so the serial order follows the issue order.
 *
 * The local government used is the one already assigned, else what the
 * applicant asked for, else their own LGA — provided it is one of Anambra's 21.
 * A card where none of those is a real LGA is SKIPPED and listed: assign its
 * Local Government of Operation by hand, then re-run.
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
    select: {
      id: true,
      firstName: true,
      surname: true,
      lga: true,
      operationLga: true,
      preferredOperationLga: true,
    },
  });

  console.log(`${missing.length} issued card(s) without an ID number.\n`);
  if (missing.length === 0) return;

  const existing = await db.parkMonitorApplication.findMany({
    where: { idCode: { not: null } },
    select: { idCode: true },
  });
  const codes = existing.map((e) => e.idCode as string);

  // Next serial per LGA prefix, continuing after any codes already assigned.
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

  const skipped: string[] = [];
  for (const app of missing) {
    const name = `${app.firstName} ${app.surname}`;
    const lga = app.operationLga || suggestedOperationLga(app);
    if (!lga) {
      skipped.push(`${name} (own LGA: "${app.lga}")`);
      continue;
    }
    const code = buildEnforcementCode(lga, nextSerial(enforcementCodePrefix(lga)));
    console.log(`${APPLY ? "assign" : "would assign"}  ${code}  ${name}  [${lga}]`);
    if (APPLY) {
      await db.parkMonitorApplication.update({
        where: { id: app.id },
        data: { idCode: code, operationLga: lga },
      });
    }
  }

  if (skipped.length) {
    console.log(
      `\nSkipped ${skipped.length} — no valid Local Government of Operation to use:\n  ${skipped.join("\n  ")}`,
    );
  }
  if (!APPLY) console.log("\nDry run — nothing written. Re-run with --apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
