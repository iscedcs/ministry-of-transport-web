import 'dotenv/config';
import { db } from './lib/db';

async function main() {
  console.log("Looking for APPROVED revalidations...");
  const approvedApps = await db.revalidationApplication.findMany({
    where: { status: "APPROVED" }
  });
  
  console.log(`Found ${approvedApps.length} approved revalidation applications.`);

  for (const app of approvedApps) {
    const existingPark = await db.motorPark.findUnique({
      where: { anssidNumber: app.asinNumber },
    });

    if (existingPark) {
      console.log(`Updating existing MotorPark for ASIN: ${app.asinNumber}`);
      await db.motorPark.update({
        where: { id: existingPark.id },
        data: {
          lastRevalidatedAt: app.approvedAt || new Date(),
          nextRevalidationDue: app.validUntil,
          applicationStatus: "APPROVED",
          permitStatus: "ACTIVE",
          permitExpiresAt: app.validUntil,
          permitNumber: app.revalidationNumber,
          permitIssuedAt: app.approvedAt || new Date(),
        },
      });
    } else {
      console.log(`Creating new MotorPark for ASIN: ${app.asinNumber}`);
      await db.motorPark.create({
        data: {
          businessName: app.parkName,
          transportCompanyName: app.ownerName,
          streetAddress: app.physicalLocation,
          lga: app.lga,
          townCity: app.townCommunity,
          anssidNumber: app.asinNumber,
          cacRegistrationNumber: app.cacRegistrationNumber,
          contactUserId: app.applicantUserId,
          contactPerson: app.representativeName,
          contactPhone: app.phoneNumber,
          contactEmail: app.emailAddress,
          managerResidentialAddress: app.residentialAddress,
          applicationStatus: "APPROVED",
          permitStatus: "ACTIVE",
          permitExpiresAt: app.validUntil,
          permitNumber: app.revalidationNumber,
          permitIssuedAt: app.approvedAt || new Date(),
          lastRevalidatedAt: app.approvedAt || new Date(),
          nextRevalidationDue: app.validUntil,
          approvedAt: app.approvedAt || new Date(),
        },
      });
    }
  }

  console.log("Sync complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
