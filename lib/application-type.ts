/**
 * Is this a first-time application, or an existing operator revalidating?
 *
 * The applicant is asked once, at the top of the form. Both answers use the
 * SAME form — there is no separate revalidation form for mass transit, and we
 * are not building one — but they end up in different places:
 *
 *   NEW          -> a MotorPark or MassTransitCompany application, which runs
 *                   the normal approval chain for its module.
 *   REVALIDATION -> a RevalidationApplication in the revalidation queue,
 *                   tagged with the service category so the Commissioner's
 *                   approval creates the right kind of record at the end.
 *
 * The category tag is the same field the imported-queue triage sets, so a
 * revalidation submitted through the portal and one sorted out of the vendor
 * import are indistinguishable downstream — one queue, one chain, one
 * certificate path.
 */

export type ApplicationType = "NEW" | "REVALIDATION";

export const APPLICATION_TYPES: {
  value: ApplicationType;
  label: string;
  hint: string;
}[] = [
  {
    value: "NEW",
    label: "New application",
    hint: "First time applying to the Ministry for this park or company.",
  },
  {
    value: "REVALIDATION",
    label: "Revalidation",
    hint: "Already holds an approval and is renewing it.",
  },
];

export function isRevalidation(value: unknown): boolean {
  return value === "REVALIDATION";
}
