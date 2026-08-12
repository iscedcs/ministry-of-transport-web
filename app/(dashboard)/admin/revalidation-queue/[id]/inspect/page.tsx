/**
 * Revalidation site inspection — full-width checklist.
 *
 * Mirrors the motor park inspection flow: the officer works through what the
 * applicant declared, item by item, rather than writing prose into a sidebar.
 */

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { buildChecklist, parseChecklist } from "@/lib/revalidation-checklist";
import { InspectionClient } from "./inspection-client";

export const metadata = {
  title: "Revalidation Inspection — Ministry of Transport",
};

export default async function RevalidationInspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authz = await authorize([
    "FIELD_INSPECTOR",
    "VEHICLE_INSPECTION_OFFICER",
    "HOD_PARKS_REVALIDATION",
    "HOD_PARKS",
    "SYSTEM_ADMIN",
  ]);
  if (!authz.ok) redirect("/unauthorized");

  const app = await db.revalidationApplication.findUnique({
    where: { id },
    select: {
      id: true,
      parkName: true,
      ownerName: true,
      physicalLocation: true,
      townCommunity: true,
      lga: true,
      facilityType: true,
      status: true,
      inspectionDate: true,
      inspectionOfficerId: true,
      findings: true,
      recommendation: true,
      inspectionChecklist: true,
      evidenceUrls: true,
      // Declared values the checklist is built from
      facilitiesAvailable: true,
      maintainsManifest: true,
      operatorsRegistered: true,
      paymentsUpToDate: true,
      safetySignages: true,
      pendingSanctions: true,
      sanctionDetails: true,
      managementStaffCount: true,
      adminStaffCount: true,
      securityStaffCount: true,
      otherStaffCount: true,
      securityArrangement: true,
      operationalStatus: true,
      dailyVehiclesCount: true,
    },
  });

  if (!app) notFound();

  // Resume a part-completed checklist, otherwise derive a fresh one.
  const saved = parseChecklist(app.inspectionChecklist);
  const checklist = saved.length > 0 ? saved : buildChecklist(app);

  return (
    <InspectionClient
      applicationId={app.id}
      parkName={app.parkName}
      ownerName={app.ownerName}
      location={[app.physicalLocation, app.townCommunity, app.lga]
        .filter(Boolean)
        .join(", ")}
      facilityType={app.facilityType}
      status={app.status}
      inspectionDate={app.inspectionDate}
      initialChecklist={checklist}
      initialFindings={app.findings ?? ""}
      initialRecommendation={app.recommendation ?? ""}
      isAssignedInspector={app.inspectionOfficerId === authz.session.userId}
    />
  );
}
