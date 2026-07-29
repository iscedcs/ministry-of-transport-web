import "dotenv/config";
import { db } from "./lib/db";

async function main() {
  console.log("Seeding TRACAS sample driver and vehicle...");

  const driver = await db.tracasDriver.upsert({
    where: { licenseNumber: "WHL323" },
    update: {
      fullName: "Azubuike Ifeanyi",
      phoneNumber: "08034728664",
      residentialAddress: "Government House Quarter, Awka, Anambra State",
      stateOfOrigin: "Anambra",
      lga: "Awka South",
      licenseIssueDate: new Date("2026-07-25"),
      licenseExpiryDate: new Date("2026-07-31"),
    },
    create: {
      fullName: "Azubuike Ifeanyi",
      phoneNumber: "08034728664",
      licenseNumber: "WHL323",
      residentialAddress: "Government House Quarter, Awka, Anambra State",
      stateOfOrigin: "Anambra",
      lga: "Awka South",
      licenseIssueDate: new Date("2026-07-25"),
      licenseExpiryDate: new Date("2026-07-31"),
    },
  });

  const vehicle = await db.tracasVehicle.upsert({
    where: { registrationNumber: "CH123" },
    update: {
      fleetNumber: "234RCl",
      category: "BUS",
      makeModel: "Toyota Hiace",
      engineNumber: "LLMN200",
      chassisNumber: "09877662",
      insuranceCertificateNo: "LLW0003",
      insuranceCommencement: new Date("2026-07-16"),
      insuranceExpiry: new Date("2026-08-06"),
      particularsIssueDate: new Date("2026-07-03"),
      particularsExpiryDate: new Date("2026-07-30"),
      assignedRoute: "Awka - Onitsha - Lagos Expressway",
      authorityRef: "TRAC-000003-AN",
      authorityIssueDate: new Date("2026-07-03"),
      authorityExpiryDate: new Date("2026-07-30"),
      assignedDriverId: driver.id,
    },
    create: {
      registrationNumber: "CH123",
      fleetNumber: "234RCl",
      category: "BUS",
      makeModel: "Toyota Hiace",
      engineNumber: "LLMN200",
      chassisNumber: "09877662",
      insuranceCertificateNo: "LLW0003",
      insuranceCommencement: new Date("2026-07-16"),
      insuranceExpiry: new Date("2026-08-06"),
      particularsIssueDate: new Date("2026-07-03"),
      particularsExpiryDate: new Date("2026-07-30"),
      assignedRoute: "Awka - Onitsha - Lagos Expressway",
      authorityRef: "TRAC-000003-AN",
      authorityIssueDate: new Date("2026-07-03"),
      authorityExpiryDate: new Date("2026-07-30"),
      assignedDriverId: driver.id,
    },
  });

  console.log("Seeded driver:", driver.fullName);
  console.log("Seeded vehicle:", vehicle.registrationNumber, "with ref:", vehicle.authorityRef);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
