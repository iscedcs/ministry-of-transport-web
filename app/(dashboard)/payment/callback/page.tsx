/**
 * Payment Callback Legacy Redirect — Ministry of Transport Platform
 * STORY-062 | EPIC-004
 *
 * Paystack used to redirect here. Verification is now handled by the
 * Route Handler at /api/payment/callback (which is allowed to call
 * revalidatePath). This page simply forwards the browser there so that
 * any in-flight transactions with the old callback URL still work.
 */

import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{
    reference?: string | string[];
    trxref?: string | string[];
    returnTo?: string | string[];
  }>;
}

export default async function PaymentCallbackPage({ searchParams }: PageProps) {
  const { reference, trxref, returnTo } = await searchParams;

  const normalise = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const ref = normalise(reference) ?? normalise(trxref);
  const backUrl = normalise(returnTo) ?? "/dashboard";

  // Build the API handler URL and forward the browser there.
  // The Route Handler will verify, revalidate caches, and redirect to /payment/result.
  const apiUrl = `/api/payment/callback${ref ? `?reference=${encodeURIComponent(ref)}&returnTo=${encodeURIComponent(backUrl)}` : `?returnTo=${encodeURIComponent(backUrl)}`}`;
  redirect(apiUrl);
}
