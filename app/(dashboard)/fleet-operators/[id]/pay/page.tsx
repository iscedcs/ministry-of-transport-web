/**
 * Fleet Operator / Mass Transit Registration Payment Page
 * STORY-061 | EPIC-004
 *
 * Initiates the registration fee payment for a mass transit company.
 * Route: /fleet-operators/[id]/pay
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { initiateTransitPayment } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TRANSIT_REGISTRATION_FEE_KOBO } from "@/lib/consts";
import { formatNaira as naira } from "@/lib/utils/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FleetPayPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const company = await db.massTransitCompany.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      contactEmail: true,
      asinNumber: true,
      contactUserId: true,
      applicationStatus: true,
    },
  });

  if (!company) notFound();

  const isOwner = company.contactUserId === session.userId;
  const isStaff = session.role !== "EXTERNAL_APPLICANT";
  if (!isOwner && !isStaff) redirect(`/fleet-operators/${id}`);

  // Check for existing COMPLETED payment (already paid)
  const existingPayment = await db.payment.findFirst({
    where: {
      linkedEntityType: "MASS_TRANSIT",
      linkedEntityId: id,
      status: "COMPLETED",
      paymentType: "TRANSIT_REGISTRATION",
    },
  });

  if (existingPayment) {
    redirect(`/payments/${existingPayment.id}`);
  }

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
            href="/fleet-operators"
            className="hover:text-foreground transition-colors">
            Fleet Operators
          </Link>
          <span>/</span>
          <Link
            href={`/fleet-operators/${id}`}
            className="hover:text-foreground transition-colors truncate max-w-[160px]">
            {company.companyName}
          </Link>
          <span>/</span>
          <span className="text-foreground">Pay Registration Fee</span>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={`/fleet-operators/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}>
            Registration Fee Payment
          </h1>
        </div>
      </div>

      {/* Payment summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Summary</CardTitle>
          <CardDescription>{company.companyName}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Fee Type</span>
              <span className="font-medium">Mass Transit Registration Fee</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">ASIN Number</span>
              <span className="font-mono text-xs">{company.asinNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Payer Email</span>
              <span className="font-medium">{company.contactEmail}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Application Status</span>
              <span className="font-medium">
                {company.applicationStatus.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-base font-semibold">Total Amount</span>
            <span className="text-2xl font-bold text-primary">
              {naira(TRANSIT_REGISTRATION_FEE_KOBO)}
            </span>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              You will be redirected to Paystack&apos;s secure payment page.
              Your registration fee will be confirmed automatically after
              payment.
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await initiateTransitPayment(id);
            }}>
            <Button type="submit" className="w-full" size="lg">
              <CreditCard className="mr-2 h-4 w-4" />
              Pay {naira(TRANSIT_REGISTRATION_FEE_KOBO)} Securely
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
