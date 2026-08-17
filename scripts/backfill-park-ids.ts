import "dotenv/config";
import { db } from "../lib/db";
import { nextParkId } from "../lib/park-id";

/**
 * Repair approved revalidations that have no Park ID on their certificate.
 *
 * Two faults produced this, both now fixed in approveRevalidationAsCommissioner:
 *
 *   1. When approval created a MotorPark, the application was never linked
 *      back to it. The certificate reads `application.motorPark.parkId`, found
 *      no relation, and printed "—". The park existed; the certificate just
 *      could not see it.
 *
 *   2. Creating the park required an applicant account. A government-owned
 *      park has none, so approval issued a certificate and created no park at
 *      all — nothing to carry a Park ID.
 *
 * This walks every APPROVED application and puts both right: links the one
 * that already has a park, creates the park for the one that never got one,
 * and assigns a Park ID wherever it is missing.
 *
 *   npx tsx scripts/backfill-park-ids.ts            # dry run
 *   npx tsx scripts/backfill-park-ids.ts --apply    # repair
 *
 * SAFE TO RE-RUN. A park that already holds a Park ID keeps it — the ID
 * identifies the park itself and is never reissued.
 */

const APPLY = process.argv.includes("--apply");

async function main() {
  const apps = await db.revalidationApplication.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      parkName: true,
      ownerName: true,
      revalidationNumber: true,
      motorParkId: true,
      applicantUserId: true,
      asinNumber: true,
      existingApprovalNum: true,
      physicalLocation: true,
      townCommunity: true,
      lga: true,
      representativeName: true,
      phoneNumber: true,
      emailAddress: true,
      residentialAddress: true,
      cacRegistrationNumber: true,
      approvalType: true,
      validUntil: true,
      approvedAt: true,
    },
    orderBy: { approvedAt: "asc" },
  });

  console.log(`${apps.length} approved revalidation(s).\n`);

  let linked = 0;
  let created = 0;
  let numbered = 0;
  let untouched = 0;

  for (const app of apps) {
    // Find the park this application belongs to, the same way approval does.
    let park = app.motorParkId
      ? await db.motorPark.findUnique({
          where: { id: app.motorParkId },
          select: { id: true, parkId: true, businessName: true },
        })
      : null;

    if (!park) {
      const or = [
        ...(app.asinNumber
          ? [{ anssidNumber: { equals: app.asinNumber, mode: "insensitive" as const } }]
          : []),
        ...(app.existingApprovalNum
          ? [{ permitNumber: { equals: app.existingApprovalNum, mode: "insensitive" as const } }]
          : []),
        ...(app.applicantUserId ? [{ contactUserId: app.applicantUserId }] : []),
        // Last resort: the park's own name. Two parks may share an owner but
        // rarely a name and an LGA.
        {
          businessName: { equals: app.parkName, mode: "insensitive" as const },
          ...(app.lga ? { lga: { equals: app.lga, mode: "insensitive" as const } } : {}),
        },
      ];
      park = await db.motorPark.findFirst({
        where: { OR: or },
        select: { id: true, parkId: true, businessName: true },
      });
    }

    // ── No park at all: approval never created one ──────────────────────────
    if (!park) {
      const parkId = await nextParkId();
      console.log(
        `CREATE  ${app.parkName} (${app.revalidationNumber ?? "no cert no."}) -> ${parkId}`,
      );
      if (APPLY) {
        const madePark = await db.motorPark.create({
          data: {
            businessName: app.parkName,
            transportCompanyName: app.ownerName,
            streetAddress: app.physicalLocation ?? "",
            lga: app.lga ?? "",
            townCity: app.townCommunity ?? "",
            anssidNumber: app.asinNumber,
            cacRegistrationNumber: app.cacRegistrationNumber,
            contactUserId: app.applicantUserId,
            contactPerson: app.representativeName ?? app.ownerName,
            contactPhone: app.phoneNumber ?? "",
            contactEmail: app.emailAddress ?? "",
            managerResidentialAddress: app.residentialAddress,
            applicationStatus:
              app.approvalType === "TEMPORAL" ? "TEMPORAL_APPROVAL" : "APPROVED",
            permitStatus: "ACTIVE",
            permitNumber: app.revalidationNumber,
            permitIssuedAt: app.approvedAt ?? new Date(),
            permitExpiresAt: app.validUntil,
            parkId,
            lastRevalidatedAt: app.approvedAt ?? new Date(),
            nextRevalidationDue: app.validUntil,
            approvedAt: app.approvedAt ?? new Date(),
          },
          select: { id: true },
        });
        await db.revalidationApplication.update({
          where: { id: app.id },
          data: { motorParkId: madePark.id },
        });
      }
      created += 1;
      continue;
    }

    // ── Park exists but carries no Park ID ──────────────────────────────────
    if (!park.parkId) {
      const parkId = await nextParkId();
      console.log(`NUMBER  ${park.businessName} -> ${parkId}`);
      if (APPLY) {
        await db.motorPark.update({
          where: { id: park.id },
          data: { parkId },
        });
      }
      numbered += 1;
    }

    // ── Park exists but the application does not point at it ────────────────
    if (app.motorParkId !== park.id) {
      console.log(`LINK    ${app.parkName} -> park ${park.id}`);
      if (APPLY) {
        await db.revalidationApplication.update({
          where: { id: app.id },
          data: { motorParkId: park.id },
        });
      }
      linked += 1;
      continue;
    }

    if (park.parkId) untouched += 1;
  }

  console.log(
    `\n${created} park(s) created, ${numbered} numbered, ${linked} linked, ${untouched} already correct.`,
  );
  if (!APPLY) console.log("Dry run — nothing was written. Re-run with --apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
