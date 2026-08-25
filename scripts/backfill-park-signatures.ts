import "dotenv/config";
import { db } from "../lib/db";

/**
 * Fill in the signatures on parks that were approved without recording them.
 *
 * issueTemporalApproval wrote the status and nothing else, so a park could be
 * granted temporal approval and still show "Pending Signature" against all
 * three officers. Terminals that became parks had the same gap: the company
 * passed the whole chain, but none of it was copied onto the park.
 *
 * Both are fixed going forward. This repairs the records already approved,
 * reading the truth from the audit log rather than inventing it:
 *
 *   TEMPORAL_APPROVAL_ISSUED     -> whoever performed it signed, at that time
 *   FINAL_APPROVAL_LETTER_ISSUED -> the Commissioner signed, at that time
 *
 * Where no audit entry survives it falls back to the park's own approvedAt,
 * and where there is neither it leaves the park alone rather than guessing.
 *
 *   npx tsx scripts/backfill-park-signatures.ts            # dry run
 *   npx tsx scripts/backfill-park-signatures.ts --apply    # write
 *
 * SAFE TO RE-RUN. A signature already recorded is never overwritten.
 */

const APPLY = process.argv.includes("--apply");
const APPROVED = ["APPROVED", "TEMPORAL_APPROVAL"] as const;

async function main() {
  const parks = await db.motorPark.findMany({
    where: {
      applicationStatus: { in: [...APPROVED] },
      // Only those missing the signature the status implies.
      commissionerApprovedAt: null,
      psApprovedAt: null,
    },
    select: {
      id: true,
      businessName: true,
      applicationStatus: true,
      approvedAt: true,
      approvedByUserId: true,
      hodApprovedAt: true,
    },
  });

  console.log(`${parks.length} approved park(s) with no signature recorded.\n`);

  let fixed = 0;
  let skipped = 0;

  for (const park of parks) {
    const entry = await db.auditLog.findFirst({
      where: {
        entityType: "MOTOR_PARK",
        entityId: park.id,
        action: { in: ["TEMPORAL_APPROVAL_ISSUED", "FINAL_APPROVAL_LETTER_ISSUED"] },
      },
      orderBy: { createdAt: "desc" },
      select: { action: true, createdAt: true, performedByUserId: true },
    });

    const signedAt = entry?.createdAt ?? park.approvedAt;
    if (!signedAt) {
      console.log(`SKIP    ${park.businessName} — no audit entry and no approvedAt`);
      skipped += 1;
      continue;
    }

    // A final approval is the Commissioner's. A temporal one may have been
    // issued by either officer, so the audit entry's author decides.
    let signerRole: "COMMISSIONER" | "PERMANENT_SECRETARY" = "COMMISSIONER";
    if (entry?.action === "TEMPORAL_APPROVAL_ISSUED" && entry.performedByUserId) {
      const user = await db.user.findUnique({
        where: { id: entry.performedByUserId },
        select: { role: true },
      });
      if (user?.role === "PERMANENT_SECRETARY") signerRole = "PERMANENT_SECRETARY";
    }

    const field =
      signerRole === "COMMISSIONER" ? "commissionerApprovedAt" : "psApprovedAt";

    console.log(
      `SIGN    ${park.businessName} (${park.applicationStatus}) -> ${field} ${signedAt.toDateString()}`,
    );

    if (APPLY) {
      await db.motorPark.update({
        where: { id: park.id },
        data: {
          [field]: signedAt,
          ...(park.approvedAt ? {} : { approvedAt: signedAt }),
          ...(park.approvedByUserId || !entry?.performedByUserId
            ? {}
            : { approvedByUserId: entry.performedByUserId }),
        },
      });
    }
    fixed += 1;
  }

  console.log(`\n${fixed} park(s) ${APPLY ? "updated" : "would be updated"}, ${skipped} skipped.`);
  if (!APPLY) console.log("Dry run — nothing was written. Re-run with --apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
