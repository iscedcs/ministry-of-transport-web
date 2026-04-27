/**
 * Refund Workflow Page — Ministry of Transport Platform
 * STORY-069 | EPIC-004 | FR-044
 *
 * Finance Officer initiates a refund for a completed payment.
 * Calls Paystack /refund API and updates payment status to REFUNDED.
 *
 * Access: FINANCE_OFFICER, COMMISSIONER, PERMANENT_SECRETARY
 */

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import { initiateRefund } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PageClientProps {
  paymentId: string;
  payerEmail: string;
  amount: string; // pre-formatted naira string
  reference: string | null;
  receiptNumber: string | null;
}

export function RefundForm({
  paymentId,
  payerEmail,
  amount,
  reference,
  receiptNumber,
}: PageClientProps) {
  const [state, formAction, isPending] = useActionState(initiateRefund, {
    success: false,
    error: "",
  });

  if (state.success) {
    return (
      <Card className="max-w-lg border-green-500/30 bg-green-500/5">
        <CardHeader className="text-center">
          <RefreshCw className="mx-auto h-10 w-10 text-green-600 mb-2" />
          <CardTitle>Refund Initiated</CardTitle>
          <CardDescription>
            The refund has been submitted to Paystack and the payment status has
            been updated. The customer will receive their funds within 5–10
            business days.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link href={`/payments/${paymentId}`}>Back to Payment</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="max-w-lg flex flex-col gap-4">
      <input type="hidden" name="paymentId" value={paymentId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Summary</CardTitle>
          <CardDescription>
            Confirm the details before initiating the refund
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Payer Email</span>
            <span className="font-medium">{payerEmail}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Amount to Refund</span>
            <span className="font-bold text-primary">{amount}</span>
          </div>
          {reference && (
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Paystack Reference</span>
              <span className="font-mono text-xs">{reference}</span>
            </div>
          )}
          {receiptNumber && (
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Receipt Number</span>
              <span className="font-mono">{receiptNumber}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reason">
          Reason for Refund <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="reason"
          name="reason"
          rows={4}
          required
          placeholder="Describe why this payment is being refunded (e.g., duplicate payment, overpayment, cancelled application)…"
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          This reason will be stored for audit purposes.
        </p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          This action cannot be undone. The full payment amount will be refunded
          to the customer&apos;s original payment method via Paystack.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/payments/${paymentId}`}>Cancel</Link>
        </Button>
        <Button type="submit" variant="destructive" disabled={isPending}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`}
          />
          {isPending ? "Processing…" : "Confirm Refund"}
        </Button>
      </div>
    </form>
  );
}
