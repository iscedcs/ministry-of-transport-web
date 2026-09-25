import { db } from "@/lib/db";
import type { ApplicationStatus } from "@prisma/client";

/**
 * Keep the company's status in step with its pack's inspection.
 *
 * Terminals declared on the first application are a pack: each is inspected,
 * and only once EVERY one has been inspected does the company reach
 * INSPECTION_COMPLETED and go to HOD Operations. From there the company moves
 * through its own chain (HOD Ops -> HOD Revalidation -> PS -> Commissioner),
 * and this helper stops touching it.
 *
 * Terminals added later (addedAt set) run their own chain and are ignored.
 */

const RANK: Partial<Record<ApplicationStatus, number>> = {
  SUBMITTED: 0,
  UNDER_REVIEW: 1,
  INSPECTION_SCHEDULED: 2,
  INSPECTION_COMPLETED: 3,
};

/** Company states this helper is allowed to move between. */
const EARLY = new Set<ApplicationStatus>([
  "REJECTED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "INSPECTION_SCHEDULED",
  "INSPECTION_COMPLETED",
]);

export async function syncCompanyStatusFromTerminals(companyId: string) {
  const [company, terminals] = await Promise.all([
    db.massTransitCompany.findUnique({
      where: { id: companyId },
      select: { applicationStatus: true },
    }),
    db.terminal.findMany({
      where: { companyId, addedAt: null },
      select: { applicationStatus: true },
    }),
  ]);
  if (!company || !EARLY.has(company.applicationStatus)) return;

  const pack = terminals.filter((t) => t.applicationStatus !== "REJECTED");
  if (pack.length === 0) return;

  const ranks = pack.map((t) => RANK[t.applicationStatus] ?? 0);
  const allInspected = ranks.every((r) => r >= 3);
  const anyStarted = ranks.some((r) => r >= 2);

  // A rejected company comes back to SUBMITTED once a terminal is resubmitted.
  const base: ApplicationStatus =
    company.applicationStatus === "REJECTED" ? "SUBMITTED" : company.applicationStatus;

  const next: ApplicationStatus = allInspected
    ? "INSPECTION_COMPLETED"
    : anyStarted
      ? "INSPECTION_SCHEDULED"
      : base;

  if (next === company.applicationStatus) return;

  await db.massTransitCompany.update({
    where: { id: companyId },
    data: { applicationStatus: next },
  });
}
