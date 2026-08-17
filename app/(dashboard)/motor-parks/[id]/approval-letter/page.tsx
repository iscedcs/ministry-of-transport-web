import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { authorizeDocument } from "@/lib/document-access";
import { getSession } from "@/lib/auth";
import { getNumberSetting } from "@/lib/system-config";
import { SIGNATURES } from "@/lib/signatures";
import { MotorParkApprovalLetter } from "@/components/motor-park/approval-letter";

export const metadata = {
  title: "Motor Park Approval Letter — Ministry of Transport",
};

/**
 * One letter, both outcomes. A park on TEMPORAL_APPROVAL gets the temporal
 * wording and the shorter period; a fully approved park gets the full wording.
 * Which one is printed follows the record, not the route.
 */
export default async function MotorParkApprovalLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ministry staff, or the applicant this letter belongs to. Previously any
  // signed-in account could read any park's letter by editing the URL.
  await authorizeDocument({ kind: "motorPark", id });

  const park = await db.motorPark.findUnique({
    where: { id },
    select: {
      id: true,
      businessName: true,
      transportCompanyName: true,
      streetAddress: true,
      townCity: true,
      lga: true,
      parkId: true,
      permitNumber: true,
      permitIssuedAt: true,
      permitExpiresAt: true,
      applicationStatus: true,
      monthlyLevyAmount: true,
      psRecommendationNotes: true,
      approvedAt: true,
    },
  });
  if (!park) notFound();

  const isTemporal = park.applicationStatus === "TEMPORAL_APPROVAL";

  const validityMonths =
    (await getNumberSetting(
      isTemporal
        ? "motorpark.validity.temporalMonths"
        : "motorpark.validity.permanentMonths",
    )) || (isTemporal ? 6 : 12);

  const commissioner = await db.user.findFirst({
    where: { role: "COMMISSIONER", isActive: true },
    select: { firstName: true, lastName: true },
  });

  const location =
    [park.streetAddress, park.townCity, park.lga].filter(Boolean).join(", ") ||
    null;

  return (
    <div className="flex flex-col items-center gap-4 bg-slate-900/5 p-4 dark:bg-slate-950 sm:p-8 print:min-h-0 print:bg-white print:p-0">
      <Link
        href={`/motor-parks/${park.id}`}
        className="inline-flex w-full max-w-[800px] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" />
        Back to motor park
      </Link>

      <MotorParkApprovalLetter
        data={{
          parkName: park.businessName,
          ownerName: park.transportCompanyName,
          location,
          parkId: park.parkId,
          permitNumber: park.permitNumber,
          approvalType: isTemporal ? "TEMPORAL" : "PERMANENT",
          issuedAt: park.permitIssuedAt ?? park.approvedAt,
          validUntil: park.permitExpiresAt,
          validityMonths,
          monthlyFeeKobo: park.monthlyLevyAmount,
          conditions: park.psRecommendationNotes,
          commissionerName: commissioner
            ? `${commissioner.firstName} ${commissioner.lastName}`
            : "Hon. Commissioner for Transport",
        }}
        signature={SIGNATURES.commissioner}
        showActions
      />
    </div>
  );
}
