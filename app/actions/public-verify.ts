"use server";

import { db } from "@/lib/db";

export interface PublicParkSearchResult {
  id: string;
  businessName: string;
  transportCompanyName: string | null;
  streetAddress: string;
  townCity: string;
  lga: string;
  anssidNumber: string;
  permitNumber: string | null;
  applicationStatus: string;
  permitStatus: string | null;
  approvedAt: Date | null;
  staffCount: number;
}

export async function searchPublicMotorParks(query: string): Promise<{
  success: boolean;
  data?: PublicParkSearchResult[];
  error?: string;
}> {
  try {
    const trimmed = query.trim();
    if (!trimmed) {
      return { success: true, data: [] };
    }

    const parks = await db.motorPark.findMany({
      where: {
        applicationStatus: {
          in: ["APPROVED", "TEMPORAL_APPROVAL"],
        },
        OR: [
          { businessName: { contains: trimmed, mode: "insensitive" } },
          { transportCompanyName: { contains: trimmed, mode: "insensitive" } },
          { anssidNumber: { contains: trimmed, mode: "insensitive" } },
          { permitNumber: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        businessName: true,
        transportCompanyName: true,
        streetAddress: true,
        townCity: true,
        lga: true,
        anssidNumber: true,
        permitNumber: true,
        applicationStatus: true,
        permitStatus: true,
        approvedAt: true,
        _count: {
          select: { parkStaff: true },
        },
      },
      take: 20,
    });

    const formatted: PublicParkSearchResult[] = parks.map((p) => ({
      id: p.id,
      businessName: p.businessName,
      transportCompanyName: p.transportCompanyName,
      streetAddress: p.streetAddress,
      townCity: p.townCity,
      lga: p.lga,
      anssidNumber: p.anssidNumber,
      permitNumber: p.permitNumber,
      applicationStatus: p.applicationStatus,
      permitStatus: p.permitStatus || "ACTIVE",
      approvedAt: p.approvedAt,
      staffCount: p._count.parkStaff,
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Public Park Search Error:", error);
    return { success: false, error: "Failed to perform search. Please try again." };
  }
}
