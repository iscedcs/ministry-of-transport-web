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
  title: "Park Revalidation Certificate — Ministry of Transport",
};

/**
 * The certificate the park displays, as distinct from the letter conveying the
 * decision. Issued from the same approval; the letter goes out first.
 */
export default async function ParkCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ministry staff, or the applicant this document belongs to.
  await authorizeDocument({ kind: "revalidation", id });

  const app = await db.revalidationApplication.findUnique({
    where: { id },
    select: {
      id: true,
      revalidationNumber: true,
      parkName: true,
      ownerName: true,
      ownershipType: true,
      representativeName: true,
      physicalLocation: true,
      townCommunity: true,
      lga: true,
      facilityType: true,
      serviceTypes: true,
      approvalType: true,
      approvedAt: true,
      commissionerApprovedAt: true,
      validUntil: true,
      motorPark: { select: { parkId: true } },
    },
  });
  if (!app) notFound();

  const isTemporal = app.approvalType === "TEMPORAL";
  const validityMonths =
    (await getNumberSetting(
      isTemporal
        ? "revalidation.validity.temporalMonths"
        : "revalidation.validity.permanentMonths",
    )) || (isTemporal ? 6 : 12);

  const locationParts = [
    app.physicalLocation?.trim(),
    app.townCommunity?.trim(),
    app.lga?.trim(),
  ].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;

  // Loading bays and parks are both "parks" on the certificate; the type line
  // states which.
  const parkType =
    app.facilityType === "Loading Bay"
      ? "Loading Bay"
      : app.facilityType
        ? `${app.facilityType} Motor Park`
        : "Motor Park";

  // CATEGORY comes from what the park declared it does — Inter-State, Keke,
  // Logistics and so on — rather than a fixed phrase.
  const services = Array.isArray(app.serviceTypes)
    ? (app.serviceTypes as unknown[]).filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      )
    : [];
  const category =
    services.length > 0
      ? services.join(", ")
      : "Commercial Passenger Transport";

  // A public park is owned by the State, so the useful name on the paper is
  // the manager's, not the owner's. Private parks already name their owner.
  const isPublic = /public|government|state|lga|council/i.test(
    `${app.ownershipType ?? ""} ${app.facilityType ?? ""} ${app.ownerName}`,
  );

  const commissioner = await db.user.findFirst({
    where: { role: "COMMISSIONER", isActive: true },
    select: { firstName: true, lastName: true },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="flex flex-col items-center gap-4 bg-slate-900/5 p-4 dark:bg-slate-950 sm:p-8 print:min-h-0 print:bg-white print:p-0">
      <Link
        href={`/admin/revalidation-queue/${app.id}`}
        className="inline-flex w-full max-w-[297mm] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>

      <ParkRevalidationCertificate
        data={{
          id: app.id,
          certificateNumber: app.revalidationNumber,
          parkId: app.motorPark?.parkId ?? null,
          parkName: app.parkName,
          ownerName: app.ownerName,
          managerName:
            isPublic && app.representativeName ? app.representativeName : null,
          location,
          parkType,
          category,
          approvalType: app.approvalType,
          issuedAt: app.commissionerApprovedAt ?? app.approvedAt,
          validUntil: app.validUntil,
          validityMonths,
          commissionerName: commissioner
            ? `${commissioner.firstName} ${commissioner.lastName}`
            : null,
        }}
        verifyUrl={`${base}/verify?q=${encodeURIComponent(app.revalidationNumber ?? app.id)}`}
        signature={SIGNATURES.commissioner}
        showActions
      />
    </div>
  );
}
