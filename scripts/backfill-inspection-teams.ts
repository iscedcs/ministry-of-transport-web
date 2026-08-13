import "dotenv/config";
import { db } from "../lib/db";

/**
 * Applications scheduled under the old single-inspector model have no rows in
 * RevalidationInspector. The new code decides who may fill the checklist by
 * looking for the team LEAD, so without this backfill those records are
 * stranded — nobody can file the report.
 *
 * The previously assigned officer becomes the lead of a one-person team.
 */
const APPLY = process.argv.includes("--apply");

async function main() {
  const orphaned = await db.revalidationApplication.findMany({
    where: { inspectionOfficerId: { not: null }, inspectionTeam: { none: {} } },
    select: { id: true, parkName: true, status: true, inspectionOfficerId: true },
  });

  console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — ${orphaned.length} record(s)\n`);

  for (const a of orphaned) {
    const user = await db.user.findUnique({
      where: { id: a.inspectionOfficerId! },
      select: { firstName: true, lastName: true, role: true },
    });
    if (!user) {
      console.log(`  SKIP  ${a.parkName} — assigned user ${a.inspectionOfficerId} no longer exists`);
      continue;
    }
    console.log(`  ${a.parkName} (${a.status}) → lead: ${user.firstName} ${user.lastName} [${user.role}]`);
    if (APPLY) {
      await db.revalidationInspector.create({
        data: { applicationId: a.id, userId: a.inspectionOfficerId!, isLead: true },
      });
    }
  }

  if (!APPLY) console.log("\nDry run — nothing written. Re-run with --apply.");
}
main().catch(console.error).finally(() => db.$disconnect());
