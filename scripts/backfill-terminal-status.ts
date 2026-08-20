import "dotenv/config";
import { db } from "../lib/db";

/**
 * Give existing terminals the right application status.
 *
 * Terminal.applicationStatus is new, and it defaults to SUBMITTED. Every
 * terminal already in the database predates it, so without this every
 * terminal of every approved operator would read as "awaiting approval" —
 * including the ones that are already live motor parks.
 *
 * The rule is simple and reads off the data rather than guessing: a terminal
 * that became a park was approved, and takes its company's outcome (APPROVED
 * or TEMPORAL_APPROVAL). A terminal with no park belongs to an application
 * still in flight, so it inherits that company's status too.
 *
 *   npx tsx scripts/backfill-terminal-status.ts            # dry run
 *   npx tsx scripts/backfill-terminal-status.ts --apply    # write
 *
 * SAFE TO RE-RUN.
 */

const APPLY = process.argv.includes("--apply");

async function main() {
  const terminals = await db.terminal.findMany({
    select: {
      id: true,
      terminalNumber: true,
      motorParkId: true,
      applicationStatus: true,
      company: {
        select: { companyName: true, applicationStatus: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`${terminals.length} terminal(s).\n`);

  let changed = 0;
  for (const t of terminals) {
    // A terminal that is already a park carries the company's approval; one
    // that is not simply mirrors wherever the company has got to.
    const target = t.company.applicationStatus;

    if (t.applicationStatus === target) continue;

    console.log(
      `${t.company.companyName} terminal ${t.terminalNumber}: ` +
        `${t.applicationStatus} -> ${target}` +
        (t.motorParkId ? " (already a park)" : ""),
    );

    if (APPLY) {
      await db.terminal.update({
        where: { id: t.id },
        data: {
          applicationStatus: target,
          ...(t.motorParkId ? { approvedAt: new Date() } : {}),
        },
      });
    }
    changed += 1;
  }

  console.log(`\n${changed} terminal(s) ${APPLY ? "updated" : "would change"}.`);
  if (!APPLY) console.log("Dry run — nothing was written. Re-run with --apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
