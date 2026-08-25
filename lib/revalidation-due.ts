import { db } from "@/lib/db";
import { getNumberSetting } from "@/lib/system-config";

/**
 * What an operator currently holds that is due for revalidation.
 *
 * An approval is not revalidated whenever the holder feels like it — it comes
 * round when it is close to expiring. So the applicant's revalidation page
 * lists the parks and companies that are actually due and they pick one,
 * rather than retyping details the Ministry already holds.
 *
 * "Due" means the next revalidation date falls inside the Ministry's window
 * (a setting, default 90 days) or has already passed. Anything overdue is
 * always offered, however long ago it lapsed.
 *
 * This does NOT replace applying freely. The "New revalidation" route stays,
 * because an operator may hold an approval the register does not know about —
 * most of the imported vendor records are exactly that.
 */

export interface DueAsset {
  id: string;
  kind: "MOTOR_PARK" | "MASS_TRANSIT";
  name: string;
  reference: string | null;
  location: string | null;
  dueAt: Date;
  /** Negative once the approval has already lapsed. */
  daysRemaining: number;
  overdue: boolean;
  /** Already in the queue, so it must not be started twice. */
  inProgress: boolean;
}

const APPROVED = ["APPROVED", "TEMPORAL_APPROVAL"] as const;
const DAY = 24 * 60 * 60 * 1000;

export async function getRevalidationDueAssets(
  userId: string,
): Promise<{ assets: DueAsset[]; windowDays: number }> {
  const windowDays = (await getNumberSetting("revalidation.dueWindowDays")) || 90;

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + windowDays);

  const [parks, companies, openApplications] = await Promise.all([
    db.motorPark.findMany({
      where: {
        contactUserId: userId,
        applicationStatus: { in: [...APPROVED] },
        // Either date will do: a park revalidated before has a next date, one
        // approved for the first time only has its permit expiry.
        OR: [
          { nextRevalidationDue: { lte: horizon } },
          {
            AND: [
              { nextRevalidationDue: null },
              { permitExpiresAt: { lte: horizon } },
            ],
          },
        ],
      },
      select: {
        id: true,
        businessName: true,
        parkId: true,
        permitNumber: true,
        townCity: true,
        lga: true,
        anssidNumber: true,
        nextRevalidationDue: true,
        permitExpiresAt: true,
      },
    }),
    db.massTransitCompany.findMany({
      where: {
        contactUserId: userId,
        applicationStatus: { in: [...APPROVED] },
        OR: [
          { nextRevalidationDue: { lte: horizon } },
          {
            AND: [
              { nextRevalidationDue: null },
              { permitExpiresAt: { lte: horizon } },
            ],
          },
        ],
      },
      select: {
        id: true,
        companyName: true,
        permitNumber: true,
        asinNumber: true,
        nextRevalidationDue: true,
        permitExpiresAt: true,
      },
    }),
    // Anything already in the queue for this operator, so a park is never
    // offered twice and revalidated twice.
    db.revalidationApplication.findMany({
      where: {
        applicantUserId: userId,
        status: { notIn: ["APPROVED", "REJECTED"] },
      },
      select: {
        motorParkId: true,
        massTransitCompanyId: true,
        asinNumber: true,
      },
    }),
  ]);

  const busyParkIds = new Set(
    openApplications.map((a) => a.motorParkId).filter(Boolean) as string[],
  );
  const busyCompanyIds = new Set(
    openApplications.map((a) => a.massTransitCompanyId).filter(Boolean) as string[],
  );
  // The imported records carry no link back to a park, so ASIN is the only
  // thread connecting them.
  const busyAsins = new Set(
    openApplications.map((a) => a.asinNumber?.trim()).filter(Boolean) as string[],
  );

  const now = Date.now();
  const assets: DueAsset[] = [];

  for (const p of parks) {
    const dueAt = p.nextRevalidationDue ?? p.permitExpiresAt;
    if (!dueAt) continue;
    const days = Math.ceil((dueAt.getTime() - now) / DAY);
    assets.push({
      id: p.id,
      kind: "MOTOR_PARK",
      name: p.businessName,
      reference: p.parkId ?? p.permitNumber,
      location: [p.townCity, p.lga].filter(Boolean).join(", ") || null,
      dueAt,
      daysRemaining: days,
      overdue: days < 0,
      inProgress:
        busyParkIds.has(p.id) ||
        (!!p.anssidNumber && busyAsins.has(p.anssidNumber.trim())),
    });
  }

  for (const c of companies) {
    const dueAt = c.nextRevalidationDue ?? c.permitExpiresAt;
    if (!dueAt) continue;
    const days = Math.ceil((dueAt.getTime() - now) / DAY);
    assets.push({
      id: c.id,
      kind: "MASS_TRANSIT",
      name: c.companyName,
      reference: c.permitNumber,
      location: null,
      dueAt,
      daysRemaining: days,
      overdue: days < 0,
      inProgress:
        busyCompanyIds.has(c.id) ||
        (!!c.asinNumber && busyAsins.has(c.asinNumber.trim())),
    });
  }

  // Most urgent first: what has already lapsed, then what is closest.
  assets.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  return { assets, windowDays };
}
