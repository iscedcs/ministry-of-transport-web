import "dotenv/config";
import { db } from "../lib/db";

/**
 * Release applications that triage parked as WAITLISTED.
 *
 * Routing an imported record to "fresh application" used to set its status to
 * WAITLISTED. That status is not in the schedulable set, so no inspection
 * could be booked and the record was stranded — the officers could see it and
 * do nothing with it.
 *
 * Triage is a routing decision, not a halt. routeRevalidationApplication no
 * longer touches the status; this puts the already-affected records back to
 * SUBMITTED so an inspection can be scheduled.
 *
 *   npx tsx scripts/release-waitlisted-triage.ts            # dry run
 *   npx tsx scripts/release-waitlisted-triage.ts --apply    # release
 *
 * Only touches records that were triaged. A WAITLISTED application that was
 * never triaged was put there by something else and is left alone.
 */

const APPLY = process.argv.includes("--apply");

async function main() {
  const stranded = await db.revalidationApplication.findMany({
    where: { status: "WAITLISTED", triagedAt: { not: null } },
    select: {
      id: true,
      parkName: true,
      triageRoute: true,
      triagedAt: true,
    },
    orderBy: { triagedAt: "asc" },
  });

  console.log(`${stranded.length} triaged application(s) sitting at WAITLISTED.\n`);

  for (const app of stranded) {
    console.log(
      `RELEASE  ${app.parkName} (${app.triageRoute ?? "no route"}) -> SUBMITTED`,
    );
    if (APPLY) {
      await db.revalidationApplication.update({
        where: { id: app.id },
        data: { status: "SUBMITTED" },
      });
    }
  }

  console.log(
    `\n${stranded.length} application(s) ${APPLY ? "released" : "would be released"}.`,
  );
  if (!APPLY) console.log("Dry run — nothing was written. Re-run with --apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
