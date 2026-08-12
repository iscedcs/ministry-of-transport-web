/**
 * Revalidation certificate — printable letter on the Ministry letterhead.
 *
 * The Commissioner's signature is injected here, from this authenticated
 * server route, so the image never reaches a public bundle (see
 * lib/signatures.ts). It only renders once the Commissioner has approved.
 */

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
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

  const authz = await authorize([
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "HOD_PARKS_REVALIDATION",
    "HOD_PARKS",
    "SYSTEM_ADMIN",
    "ICT_OFFICER",
  ]);
  if (!authz.ok) redirect("/unauthorized");

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
    },
  });

  if (!application) notFound();

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-slate-900/5 dark:bg-slate-950 flex flex-col items-center print:p-0 print:min-h-0">
      <RevalidationCertificate
        application={application}
        showActions
        signature={SIGNATURES.commissioner}
      />
    </div>
  );
}
