/**
 * Payment Result Display Page — Ministry of Transport Platform
 * STORY-062 | EPIC-004 | FR-040
 *
 * Pure display page — reads only from search params, makes no DB calls.
 * The /api/payment/callback Route Handler performs verification and redirects here.
 *
 * Route: /payment/result
 * Search params:
 *   status       — "success" | "failed" | "invalid" | other string
 *   paymentId    — (on success) DB payment ID
 *   receiptNumber — (on success) human-readable receipt number
 *   ref          — Paystack transaction reference
 *   error        — (on failure) user-facing error message
 *   returnTo     — URL to send the user back to their application
 */

import Link from "next/link";
import { CheckCircle2, XCircle, AlertCircle, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    paymentId?: string;
    receiptNumber?: string;
    ref?: string;
    error?: string;
    returnTo?: string;
  }>;
}

export default async function PaymentResultPage({ searchParams }: PageProps) {
  const { status, paymentId, receiptNumber, ref, error, returnTo } =
    await searchParams;

  const backUrl = returnTo ?? "/dashboard";

  // ── Invalid / missing reference ────────────────────────────────────────────
  if (!status || status === "invalid") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-destructive/30">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-2" />
            <CardTitle>Invalid Payment Link</CardTitle>
            <CardDescription>
              No payment reference was provided. This link may be invalid or
              expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Payment failed / abandoned ─────────────────────────────────────────────
  if (status === "failed") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-destructive/30 bg-destructive/5">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive mb-2" />
            <CardTitle>Payment Not Completed</CardTitle>
            <CardDescription>
              {error ?? "The payment could not be completed. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {ref && (
              <p className="text-xs text-muted-foreground text-center">
                Reference: <span className="font-mono">{ref}</span>
              </p>
            )}
            <div className="flex gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href={backUrl}>Back</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Payment successful ─────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-green-500/30 bg-green-500/5">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-2" />
            <CardTitle className="text-green-700">
              Payment Successful!
            </CardTitle>
            <CardDescription>
              Your payment has been received and recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {receiptNumber && (
              <div className="bg-white dark:bg-card border border-border rounded-lg p-4 w-full text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <ReceiptText className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Receipt Number
                  </span>
                </div>
                <span className="text-lg font-bold font-mono text-primary">
                  {receiptNumber}
                </span>
              </div>
            )}
            {ref && (
              <p className="text-xs text-muted-foreground text-center">
                Reference: <span className="font-mono">{ref}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-3 justify-center">
              {paymentId && (
                <Button asChild size="sm">
                  <Link href={`/payments/${paymentId}`}>View Receipt</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={backUrl}>Back to Application</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Other status (already_completed, refunded, etc.) ──────────────────────
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-2" />
          <CardTitle>Payment Status: {status}</CardTitle>
          <CardDescription>
            This payment has already been processed with status: {status}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-3">
          {paymentId && (
            <Button asChild size="sm">
              <Link href={`/payments/${paymentId}`}>View Payment</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={backUrl}>Back</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
