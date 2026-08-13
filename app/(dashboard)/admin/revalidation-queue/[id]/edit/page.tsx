import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { EditRevalidationClient } from "./edit-client";

export const metadata = {
  title: "Edit Revalidation Application — Ministry of Transport",
};

/** Every field the edit form can write, in the order the form renders them. */
const EDITABLE = [
  "ownerName",
  "ownershipType",
  "representativeName",
  "designation",
  "phoneNumber",
  "alternatePhoneNumber",
  "emailAddress",
  "residentialAddress",
  "cacRegistrationNumber",
  "asinNumber",
  "nin",
  "tin",
  "parkName",
  "facilityType",
  "physicalLocation",
  "townCommunity",
  "lga",
  "yearEstablished",
  "operationalStatus",
  "dailyVehiclesCount",
  "vehicleTypes",
  "existingApprovalNum",
  "maintainsManifest",
  "operatorsRegistered",
  "paymentsUpToDate",
  "safetySignages",
  "pendingSanctions",
  "sanctionDetails",
  "managementStaffCount",
  "adminStaffCount",
  "securityStaffCount",
  "otherStaffCount",
  "securityArrangement",
  "estimatedDailyRevenue",
  "estimatedMonthlyRev",
  "revenueCollectionMethod",
] as const;

export default async function EditRevalidationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authz = await authorize([
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "SYSTEM_ADMIN",
  ]);
  if (!authz.ok) redirect("/unauthorized");

  const app = await db.revalidationApplication.findUnique({ where: { id } });
  if (!app) notFound();

  // A certificate has already been issued against these values.
  if (app.status === "APPROVED") {
    redirect(`/admin/revalidation-queue/${id}`);
  }

  const record = app as unknown as Record<string, unknown>;
  const initial: Record<string, string> = {};
  for (const key of EDITABLE) {
    const v = record[key];
    initial[key] =
      v === null || v === undefined
        ? ""
        : typeof v === "boolean"
          ? String(v)
          : String(v);
  }

  const incompleteSections = Array.isArray(app.incompleteSections)
    ? (app.incompleteSections as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    : [];

  return (
    <EditRevalidationClient
      applicationId={app.id}
      parkName={app.parkName}
      initial={initial}
      incompleteSections={incompleteSections}
      isVendorImport={app.dataSource === "VENDOR_IMPORT"}
    />
  );
}
