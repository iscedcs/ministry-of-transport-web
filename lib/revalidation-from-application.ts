import { db } from "@/lib/db";

/**
 * Turn a completed application form into a revalidation application.
 *
 * An operator who already holds an approval fills in the ordinary motor park
 * or mass transit form — there is only one form per module — and ticks
 * "Revalidation" at the top. Rather than creating a second park or company on
 * the register, the submission is written into the revalidation queue, where
 * it joins the records sorted out of the vendor import and follows the same
 * chain: inspection, HOD Operations, HOD Revalidation, PS, Commissioner.
 *
 * serviceCategory is set here, so the Commissioner's approval knows whether
 * to produce a motor park or a mass transit company with its terminals — the
 * same branch the imported-queue triage feeds.
 */
export interface RevalidationSeed {
  serviceCategory: "MOTOR_PARK" | "MASS_TRANSIT";
  parkName: string;
  ownerName: string;
  asinNumber: string;
  applicantUserId?: string | null;
  cacRegistrationNumber?: string | null;
  representativeName?: string | null;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  residentialAddress?: string | null;
  physicalLocation?: string | null;
  townCommunity?: string | null;
  lga?: string | null;
  facilityType?: string | null;
  serviceTypes?: unknown;
  facilitiesAvailable?: unknown;
}

export async function createRevalidationFromApplication(seed: RevalidationSeed) {
  // An operator who is already in the queue must not be entered twice — a
  // duplicate revalidation would be inspected and approved separately and
  // produce two certificates for one park.
  const existing = await db.revalidationApplication.findFirst({
    where: {
      asinNumber: seed.asinNumber,
      status: { notIn: ["APPROVED", "REJECTED"] },
    },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false as const,
      error:
        "A revalidation for this ASIN is already in the queue. Track it from your dashboard rather than applying again.",
    };
  }

  const app = await db.revalidationApplication.create({
    data: {
      parkName: seed.parkName,
      ownerName: seed.ownerName,
      asinNumber: seed.asinNumber,
      applicantUserId: seed.applicantUserId ?? null,
      cacRegistrationNumber: seed.cacRegistrationNumber ?? null,
      representativeName: seed.representativeName ?? null,
      phoneNumber: seed.phoneNumber ?? null,
      emailAddress: seed.emailAddress ?? null,
      residentialAddress: seed.residentialAddress ?? null,
      physicalLocation: seed.physicalLocation ?? null,
      townCommunity: seed.townCommunity ?? null,
      lga: seed.lga ?? null,
      facilityType: seed.facilityType ?? null,
      serviceCategory: seed.serviceCategory,
      // Submitted through the portal by an operator who says they already
      // hold an approval, so the route is settled — unlike an imported
      // record, where an officer has to decide.
      triageRoute: "REVALIDATION",
      status: "SUBMITTED",
      ...(seed.serviceTypes ? { serviceTypes: seed.serviceTypes as never } : {}),
      ...(seed.facilitiesAvailable
        ? { facilitiesAvailable: seed.facilitiesAvailable as never }
        : {}),
    },
    select: { id: true },
  });

  return { success: true as const, data: { revalidationId: app.id } };
}
