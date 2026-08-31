/**
 * Edit Mass Transit Operator Application Page — Ministry of Transport Platform
 *
 * Enables Admins, HODs, and Ministry Executives to update company registration,
 * contact particulars, and fleet size for a mass transit application.
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { EditFleetOperatorClient } from "./edit-client";

export const metadata = {
  title: "Edit Mass Transit Application — Ministry of Transport",
};

export default async function EditFleetOperatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowedRoles = [
    "ADMIN",
    "SYSTEM_ADMIN",
    "HOD_PARKS",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
  ];

  if (!allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const company = await db.massTransitCompany.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      cacNumber: true,
      asinNumber: true,
      contactPerson: true,
      contactPhone: true,
      contactEmail: true,
      businessPremisesCert: true,
      ansaaRegistration: true,
      approvedColour: true,
      currentFleetSize: true,
      minFleetSize: true,
      applicationStatus: true,
      permitStatus: true,
      permitNumber: true,
      monthlyLevyAmount: true,
      assessedFeeAmount: true,
      psRecommendationNotes: true,
      facilitiesAvailable: true,
      terminals: {
        orderBy: { terminalNumber: "asc" },
        take: 1,
        select: {
          id: true,
          locationAddress: true,
          gpsCoordinates: true,
          managerName: true,
          managerPhone: true,
          managerEmail: true,
          managerResidentialAddress: true,
          businessPremisesCertNo: true,
        },
      },
    },
  });

  if (!company) notFound();

  return <EditFleetOperatorClient company={company} />;
}
