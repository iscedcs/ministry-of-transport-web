import { redirect } from "next/navigation";

/**
 * Retired. The temporal certificate was drawn on its own black-bordered
 * design, outside the Ministry letterhead, and signed with a typed placeholder
 * rather than the Commissioner's signature.
 *
 * It is replaced by a single approval letter that covers both temporal and
 * full approval and follows the park's actual status. This redirect keeps any
 * link already handed out — printed, bookmarked or in an email — working.
 */
export default async function TemporalCertificateRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/motor-parks/${id}/approval-letter`);
}
