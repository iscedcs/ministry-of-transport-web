/**
 * Refund Page — Ministry of Transport Platform
 * STORY-069 | EPIC-004 | FR-044
 *
 * Server component wrapper. Validates access + fetches payment, then renders RefundForm.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getPaymentDetail } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { RefundForm } from "./refund-form";
import { formatNaira as naira } from "@/lib/utils/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

const ALLOWED_ROLES = [
  "FINANCE_OFFICER",
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "SYSTEM_ADMIN",
];

export default async function RefundPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!ALLOWED_ROLES.includes(session.role)) {
    redirect("/payments");
  }

  const { id } = await params;
  const result = await getPaymentDetail(id);

  if (!result.success) notFound();

  const payment = result.data!;

  if (payment.status !== "COMPLETED") {
    redirect(`/payments/${id}`);
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/payments"
            className="hover:text-foreground transition-colors">
            Payments
          </Link>
          <span>/</span>
          <Link
            href={`/payments/${id}`}
            className="hover:text-foreground transition-colors">
            Receipt
          </Link>
          <span>/</span>
          <span className="text-foreground">Refund</span>
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={`/payments/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}>
            Initiate Refund
          </h1>
        </div>
      </div>

      <RefundForm
        paymentId={payment.id}
        payerEmail={payment.payerEmail}
        amount={naira(payment.amount)}
        reference={payment.paystackTransactionId}
        receiptNumber={payment.receipt?.receiptNumber ?? null}
      />
    </div>
  );
}
