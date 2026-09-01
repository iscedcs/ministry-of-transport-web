/**
 * Revalidation certificate — printable letter on the Ministry letterhead.
 *
 * The Commissioner's signature is injected here, from this authenticated
 * server route, so the image never reaches a public bundle (see
 * lib/signatures.ts). It only renders once the Commissioner has approved.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { authorizeDocument } from "@/lib/document-access";
import { authorize } from "@/lib/auth";
import { SIGNATURES } from "@/lib/signatures";
import { RevalidationCertificate } from "@/components/revalidation/revalidation-certificate";

export const metadata = {
  title: "Revalidation Certificate — Ministry of Transport",
};

export default async function RevalidationCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ministry staff, or the applicant this document belongs to.
  await authorizeDocument({ kind: "revalidation", id });

  const application = await db.revalidationApplication.findUnique({
    where: { id },
    select: {
      id: true,
      revalidationNumber: true,
      parkName: true,
      ownerName: true,
      representativeName: true,
      residentialAddress: true,
      physicalLocation: true,
      townCommunity: true,
      lga: true,
      facilityType: true,
      approvedAt: true,
      validUntil: true,
      effectiveFrom: true,
      monthlyFeeAmount: true,
      previousMonthlyFeeAmount: true,
      requiredFacilities: true,
      commissionerApprovedAt: true,
      approvalType: true,
      motorPark: {
        select: {
          businessName: true,
          streetAddress: true,
          townCity: true,
          lga: true,
        },
      },
    },
  });

  if (!application) notFound();

  const mergedApplication = {
    ...application,
    parkName: application.parkName || application.motorPark?.businessName || "",
    physicalLocation:
      application.physicalLocation || application.motorPark?.streetAddress || null,
    townCommunity:
      application.townCommunity || application.motorPark?.townCity || null,
    lga: application.lga || application.motorPark?.lga || null,
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-slate-900/5 dark:bg-slate-950 flex flex-col items-center print:p-0 print:min-h-0">
      <Link
        href={`/admin/revalidation-queue/${application.id}`}
        className="mb-4 inline-flex w-full max-w-[210mm] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>
      <RevalidationCertificate
        application={mergedApplication}
        showActions
        signature={SIGNATURES.commissioner}
      />
    </div>
  );
}
