/**
 * Edit Motor Park Application Page — Ministry of Transport Platform
 *
 * Enables Admins, HODs, and Ministry Executives to update address,
 * contact particulars, and business details for a motor park application.
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { EditMotorParkClient } from "./edit-client";

export const metadata = {
  title: "Edit Motor Park Application — Ministry of Transport",
};

export default async function EditMotorParkPage({
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

  const park = await db.motorPark.findUnique({
    where: { id },
    select: {
      id: true,
      businessName: true,
      transportCompanyName: true,
      streetAddress: true,
      townCity: true,
      lga: true,
      gpsCoordinates: true,
      cacRegistrationNumber: true,
      anssidNumber: true,
      parkId: true,
      contactPerson: true,
      contactPhone: true,
      contactEmail: true,
      managerResidentialAddress: true,
      nextOfKinName: true,
      nextOfKinPhone: true,
      applicationStatus: true,
      permitStatus: true,
      permitNumber: true,
      monthlyLevyAmount: true,
      assessedFeeAmount: true,
      psRecommendationNotes: true,
    },
  });

  if (!park) notFound();

  return <EditMotorParkClient park={park} />;
}
