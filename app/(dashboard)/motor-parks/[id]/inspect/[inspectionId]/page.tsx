/**
 * Motor Park Inspection Report — Ministry of Transport Platform
 *
 * Replaces the old scored AN/MOT/40/29 checklist with the same
 * declared-vs-found checklist (Sections A-D, F, G) mass transit and
 * revalidation use. Only the lead inspector files this; the rest of the
 * team leaves a comment from the park's own page.
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMotorPark } from "@/app/actions/motor-park";
import InspectionReportClient from "./inspection-client";

export const metadata = {
  title: "Inspection Report — Ministry of Transport",
};

export default async function MotorParkInspectionPage({
  params,
}: {
  params: Promise<{ id: string; inspectionId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id: parkId, inspectionId } = await params;
  const result = await getMotorPark(parkId);
  if (!result.success || !result.data) notFound();

  const park = result.data;
  const isLead = park.inspectorTeam.some(
    (m) => m.userId === session.userId && m.isLead,
  );
  if (!isLead && session.role !== "SYSTEM_ADMIN") {
    redirect(`/motor-parks/${parkId}`);
  }

  return (
    <InspectionReportClient
      parkId={parkId}
      inspectionId={inspectionId}
      parkName={park.businessName}
      facilitiesAvailable={park.facilitiesAvailable}
      declarations={{
        maintainsManifest: park.maintainsManifest,
        operatorsRegistered: park.operatorsRegistered,
        paymentsUpToDate: park.paymentsUpToDate,
        safetySignages: park.safetySignages,
        pendingSanctions: park.pendingSanctions,
        sanctionDetails: park.sanctionDetails,
        managementStaffCount: park.managementStaffCount,
        adminStaffCount: park.adminStaffCount,
        securityStaffCount: park.securityStaffCount,
        otherStaffCount: park.otherStaffCount,
        securityArrangement: park.securityArrangement,
        operationalStatus: park.operationalStatus,
        dailyVehiclesCount: park.dailyVehiclesCount,
      }}
    />
  );
}
