import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { authorizeDocument } from "@/lib/document-access";
import { authorize } from "@/lib/auth";
import { getNumberSetting } from "@/lib/system-config";
import { SIGNATURES } from "@/lib/signatures";
import { ParkRevalidationCertificate } from "@/components/revalidation/park-revalidation-certificate";

export const metadata = {
  title: "Park Certificate — Ministry of Transport",
};

/**
 * The certificate a park displays, issued from the park record itself.
 *
 * A mass transit terminal is a park, so the same document serves both. When
 * the park came from a terminal the wording follows the Ministry's format:
 *
 *   PARK NAME          the mass transit company
 *   OWNED / OPERATED BY the company
 *   TYPE OF PARK       ABC LIMITED MOTORS TERMINAL ONE
 */
export default async function ParkCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ministry staff, or the applicant this document belongs to.
  await authorizeDocument({ kind: "motorPark", id });

  const park = await db.motorPark.findUnique({
    where: { id },
    select: {
      id: true,
      parkId: true,
      businessName: true,
      transportCompanyName: true,
      streetAddress: true,
      townCity: true,
      lga: true,
      permitNumber: true,
      permitIssuedAt: true,
      permitExpiresAt: true,
      applicationStatus: true,
      approvedAt: true,
      terminal: {
        select: {
          terminalNumber: true,
          company: { select: { companyName: true, contactPerson: true } },
        },
      },
    },
  });
  if (!park) notFound();

  const isTemporal = park.applicationStatus === "TEMPORAL_APPROVAL";
  const fromTerminal = !!park.terminal;

  const validityMonths =
    (await getNumberSetting(
      fromTerminal
        ? isTemporal
          ? "masstransit.validity.temporalMonths"
          : "masstransit.validity.permanentMonths"
        : isTemporal
          ? "motorpark.validity.temporalMonths"
          : "motorpark.validity.permanentMonths",
    )) || (isTemporal ? 6 : 12);

  // For a terminal, TYPE OF PARK carries the terminal designation, which was
  // stored on the park as transportCompanyName when it was created.
  const parkType = fromTerminal
    ? park.transportCompanyName
    : "Motor Park";

  const locationParts = [
    park.streetAddress?.trim(),
    park.townCity?.trim(),
    park.lga?.trim(),
  ].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="flex flex-col items-center gap-4 bg-slate-900/5 p-4 dark:bg-slate-950 sm:p-8 print:bg-white print:p-0">
      <Link
        href={`/motor-parks/${park.id}`}
        className="inline-flex w-full max-w-[297mm] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" />
        Back to park
      </Link>

      <ParkRevalidationCertificate
        data={{
          id: park.id,
          certificateNumber: park.permitNumber,
          parkId: park.parkId,
          parkName: park.businessName,
          ownerName:
            park.terminal?.company.companyName ??
            park.transportCompanyName ??
            park.businessName,
          location,
          parkType,
          category: fromTerminal
            ? "Mass Transit Operations"
            : "Commercial Passenger Transport",
          approvalType: isTemporal ? "TEMPORAL" : "PERMANENT",
          issuedAt: park.permitIssuedAt ?? park.approvedAt,
          validUntil: park.permitExpiresAt,
          validityMonths,
        }}
        verifyUrl={`${base}/verify?q=${encodeURIComponent(park.parkId ?? park.id)}`}
        signature={SIGNATURES.commissioner}
        showActions
      />
    </div>
  );
}
