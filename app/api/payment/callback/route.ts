/**
 * Payment Callback Route Handler — Ministry of Transport Platform
 * STORY-062 | EPIC-004 | FR-040
 *
 * Paystack redirects the browser here after checkout (GET request).
 * Route Handlers are NOT renders, so revalidatePath() is safe to call here.
 *
 * Flow:
 *  1. Paystack → GET /api/payment/callback?reference=X&returnTo=Y
 *  2. This handler verifies the transaction and revalidates cached paths.
 *  3. Browser is redirected to /payment/result?... (pure display page).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAndCompletePayment } from "@/app/actions/payments";

const normalise = (v: string | null) => v ?? undefined;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const reference =
    normalise(searchParams.get("reference")) ??
    normalise(searchParams.get("trxref"));
  const returnTo = normalise(searchParams.get("returnTo")) ?? "/dashboard";

  const resultBase = new URL("/payment/result", request.nextUrl.origin);
  resultBase.searchParams.set("returnTo", returnTo);

  if (!reference) {
    resultBase.searchParams.set("status", "invalid");
    return NextResponse.redirect(resultBase, { status: 302 });
  }

  resultBase.searchParams.set("ref", reference);

  const result = await verifyAndCompletePayment(reference);

  if (!result.success) {
    resultBase.searchParams.set("status", "failed");
    resultBase.searchParams.set("error", result.error);
    return NextResponse.redirect(resultBase, { status: 302 });
  }

  const { status, paymentId, receiptNumber } = result.data!;
  resultBase.searchParams.set("status", status);
  if (paymentId) resultBase.searchParams.set("paymentId", paymentId);
  if (receiptNumber)
    resultBase.searchParams.set("receiptNumber", receiptNumber);

  return NextResponse.redirect(resultBase, { status: 302 });
}
