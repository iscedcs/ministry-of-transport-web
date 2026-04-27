/**
 * Motor Park Fee Payment Page — Ministry of Transport Platform
 * STORY-061 | EPIC-004
 *
 * Shown when an applicant (or staff on their behalf) clicks "Pay Fee" on a
 * motor park. Fetches the fee details, shows a confirmation card, then
 * initiates the Paystack transaction and redirects to checkout.
 *
 * Route: /motor-parks/[id]/pay?feeId=xxx
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { initiateMotorParkFeePayment } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatNaira as naira, fmtDate } from "@/lib/utils/format";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feeId?: string }>;
}

export default async function MotorParkPayPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { feeId } = await searchParams;

  if (!feeId) redirect(`/motor-parks/${id}`);

  // Fetch fee + park details
  const fee = await db.motorParkFee.findUnique({
    where: { id: feeId },
    include: {
      motorPark: {
        select: {
          id: true,
          businessName: true,
          contactEmail: true,
          anssidNumber: true,
          contactUserId: true,
        },
      },
    },
  });

  if (!fee || fee.motorParkId !== id) notFound();

  // Access check
  const isOwner = fee.motorPark.contactUserId === session.userId;
  const isStaff = session.role !== "EXTERNAL_APPLICANT";
  if (!isOwner && !isStaff) redirect(`/motor-parks/${id}`);

  if (fee.status !== "PENDING") {
    // Find the completed payment so we can show the receipt rather than
    // silently redirecting back to the motor park page.
    const completedPayment = await db.payment.findFirst({
      where: {
        linkedEntityType: "MOTOR_PARK",
        linkedEntityId: id,
        status: "COMPLETED",
        paymentType: fee.feeType,
      },
      orderBy: { completedAt: "desc" },
      select: { id: true },
    });
    if (completedPayment) {
      redirect(`/payments/${completedPayment.id}`);
    }
    redirect(`/motor-parks/${id}`);
  }

  const feeLabels: Record<string, string> = {
    APPLICATION: "Application Processing Fee",
    MONTHLY_LEVY: "Monthly Park Levy",
    ANNUAL: "Annual Registration Fee",
    REVALIDATION: "Revalidation Fee",
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href="/motor-parks"
            className="hover:text-foreground transition-colors">
            Motor Parks
          </Link>
          <span>/</span>
          <Link
            href={`/motor-parks/${id}`}
            className="hover:text-foreground transition-colors truncate max-w-[160px]">
            {fee.motorPark.businessName}
          </Link>
          <span>/</span>
          <span className="text-foreground">Pay Fee</span>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={`/motor-parks/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}>
            Complete Payment
          </h1>
        </div>
      </div>

      {/* Payment summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Summary</CardTitle>
          <CardDescription>{fee.motorPark.businessName}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Fee Type</span>
              <span className="font-medium">
                {feeLabels[fee.feeType] ?? fee.feeType}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Due Date</span>
              <span className="font-medium">
                {fmtDate(fee.dueDate)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">ASIN Number</span>
              <span className="font-mono text-xs">
                {fee.motorPark.anssidNumber}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Payer Email</span>
              <span className="font-medium">{fee.motorPark.contactEmail}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-base font-semibold">Total Amount</span>
            <span className="text-2xl font-bold text-primary">
              {naira(fee.amount)}
            </span>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              You will be redirected to Paystack&apos;s secure payment page.
              Payment is processed by Paystack and your card details are never
              stored on our servers.
            </p>
          </div>

          {/* Initiates Paystack redirect via server action */}
          <form
            action={async () => {
              "use server";
              await initiateMotorParkFeePayment(feeId);
            }}>
            <Button type="submit" className="w-full" size="lg">
              <CreditCard className="mr-2 h-4 w-4" />
              Pay {naira(fee.amount)} Securely
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
