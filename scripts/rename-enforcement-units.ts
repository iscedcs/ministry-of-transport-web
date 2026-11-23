import "dotenv/config";
import { db } from "../lib/db";
import { LEGACY_ENFORCEMENT_TYPES } from "../lib/enforcement-type";

/**
 * Rewrite unit codes from the earlier list to the current one:
 *   RECOVERY_UNIT  -> RETRIEVER_UNIT
 *   PARK_MONITORS  -> PARK_MONITORING_UNIT
 * on both applications and groups.
 *
 *   npx tsx scripts/rename-enforcement-units.ts            # dry run
 *   npx tsx scripts/rename-enforcement-units.ts --apply    # rewrite
 *
 * SAFE TO RE-RUN: once nothing carries an old code it changes nothing.
 */
const APPLY = process.argv.includes("--apply");

async function main() {
  for (const [from, to] of Object.entries(LEGACY_ENFORCEMENT_TYPES)) {
    const apps = await db.parkMonitorApplication.count({ where: { enforcementType: from } });
    const groups = await db.enforcementGroup.count({ where: { unit: from } });
    console.log(`${from} -> ${to}: ${apps} application(s), ${groups} group(s)`);
    if (APPLY && (apps || groups)) {
      await db.parkMonitorApplication.updateMany({
        where: { enforcementType: from },
        data: { enforcementType: to },
      });
      await db.enforcementGroup.updateMany({ where: { unit: from }, data: { unit: to } });
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
