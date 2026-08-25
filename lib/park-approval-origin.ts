import { db } from "@/lib/db";

/**
 * Where a park's current approval came from.
 *
 * A park approved through the revalidation chain gets a MotorPark record with
 * an APPROVED status, which made it indistinguishable from a park approved
 * through the motor park chain — so it was offered BOTH documents: a motor
 * park approval letter it was never granted, and its revalidation
 * certificate. Two letters for one decision, saying different things.
 *
 * The revalidation certificate is the operative document for these parks.
 * The motor park letter is withheld, not merely hidden: the route redirects,
 * so a saved link or a typed URL cannot produce the wrong paper either.
 *
 * A park originally approved as a motor park and revalidated later is also
 * covered — its current approval is the revalidation, and that is the
 * document that reflects the terms in force.
 */
export async function getRevalidationForPark(parkId: string): Promise<{
  id: string;
  revalidationNumber: string | null;
} | null> {
  const application = await db.revalidationApplication.findFirst({
    where: { motorParkId: parkId, status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
    select: { id: true, revalidationNumber: true },
  });

  return application ?? null;
}

/**
 * The same question for many parks at once, for list and dashboard views
 * where asking per park would mean one query per row.
 */
export async function getRevalidatedParkIds(
  parkIds: string[],
): Promise<Set<string>> {
  if (parkIds.length === 0) return new Set();

  const rows = await db.revalidationApplication.findMany({
    where: { motorParkId: { in: parkIds }, status: "APPROVED" },
    select: { motorParkId: true },
  });

  return new Set(rows.map((r) => r.motorParkId).filter(Boolean) as string[]);
}
