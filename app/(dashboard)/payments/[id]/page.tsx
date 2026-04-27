/**
 * Payment Detail Page — Ministry of Transport Platform
 * STORY-064 | EPIC-004 | FR-041
 *
 * Shows full payment details + receipt. Accessible to the payer and
 * Finance Officer / Admin. Includes action bar for Finance staff to
 * initiate refunds.
 */

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { getPaymentDetail } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RowFlex as Row } from "@/components/ui/row";
import { formatNaira as naira, fmtDateTime as fmt } from "@/lib/utils/format";

const STATUS_ICON = {
  COMPLETED: <CheckCircle2 className="h-6 w-6 text-green-600" />,
  FAILED: <XCircle className="h-6 w-6 text-destructive" />,
  CANCELLED: <XCircle className="h-6 w-6 text-muted-foreground" />,
  PENDING: <Clock className="h-6 w-6 text-amber-500" />,
  PROCESSING: <Clock className="h-6 w-6 text-blue-500" />,
  REFUNDED: <RefreshCw className="h-6 w-6 text-blue-600" />,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getPaymentDetail(id);

  if (!result.success) {
    if (result.error === "Access denied") redirect("/payments");
    notFound();
  }

  const payment = result.data!;
  const isFinance = [
    "FINANCE_OFFICER",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
  ].includes(session.role);
  const canRefund = isFinance && payment.status === "COMPLETED";

  const entityUrl =
    payment.linkedEntityType === "MOTOR_PARK"
      ? `/motor-parks/${payment.motorParkId ?? payment.linkedEntityId}`
      : payment.linkedEntityType === "MASS_TRANSIT"
        ? `/fleet-operators/${payment.massTransitCompanyId ?? payment.linkedEntityId}`
        : "#";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          {isFinance && (
            <>
              <Link
                href="/payments"
                className="hover:text-foreground transition-colors">
                Payments
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">Receipt</span>
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={isFinance ? "/payments" : entityUrl}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            {STATUS_ICON[payment.status as keyof typeof STATUS_ICON] ?? null}
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}>
              Payment {payment.status === "COMPLETED" ? "Receipt" : "Record"}
            </h1>
          </div>
        </div>
      </div>

      {/* Receipt card */}
      {payment.receipt && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-sm text-primary">
                Official Receipt
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {payment.receipt.receiptNumber}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Payment details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Row
              label="Amount"
              value={
                <span className="text-lg font-bold text-primary">
                  {naira(payment.amount)}
                </span>
              }
            />
            <Row label="Currency" value={payment.currency} />
            <Row label="Type" value={payment.paymentType.replace(/_/g, " ")} />
            <Row
              label="Status"
              value={<StatusPill status={payment.status} />}
            />
            <Row
              label="Entity"
              value={payment.linkedEntityType.replace(/_/g, " ")}
            />
            <Row label="Date Initiated" value={fmt(payment.initiatedAt)} />
            <Row label="Date Completed" value={fmt(payment.completedAt)} />
          </CardContent>
        </Card>

        {/* Payer details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Payer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Email" value={payment.payerEmail} />
            <Row
              label="ASIN Number"
              value={
                <span className="font-mono text-xs">
                  {payment.payerAsinNumber}
                </span>
              }
            />
            <Row
              label="Paystack Reference"
              value={
                <span className="font-mono text-xs break-all">
                  {payment.paystackTransactionId ?? "—"}
                </span>
              }
            />
            {payment.receipt?.receiptNumber && (
              <Row
                label="Receipt Number"
                value={
                  <span className="font-mono">
                    {payment.receipt.receiptNumber}
                  </span>
                }
              />
            )}
            {payment.failureReason && (
              <Row
                label="Failure Reason"
                value={
                  <span className="text-destructive">
                    {payment.failureReason}
                  </span>
                }
              />
            )}
            {payment.reconciliationNotes && (
              <Row label="Notes" value={payment.reconciliationNotes} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Finance actions */}
      {isFinance && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Finance Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={entityUrl}>View Linked Entity</Link>
            </Button>
            {canRefund && (
              <Button asChild variant="destructive" size="sm">
                <Link href={`/payments/${payment.id}/refund`}>
                  Initiate Refund
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Receipt HTML preview */}
      {payment.receipt?.receiptHtml && (
        <>
          <Separator />
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Receipt Preview
            </h2>
            <Card>
              <CardContent className="p-0 overflow-hidden rounded-lg">
                <iframe
                  srcDoc={payment.receipt.receiptHtml}
                  className="w-full border-0 min-h-[480px]"
                  title="Payment Receipt"
                  sandbox="allow-same-origin"
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
