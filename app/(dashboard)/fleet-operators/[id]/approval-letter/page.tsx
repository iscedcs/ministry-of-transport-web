import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { getNumberSetting } from "@/lib/system-config";
import { SIGNATURES } from "@/lib/signatures";
import { terminalDesignation } from "@/lib/park-id";
import { MassTransitApprovalLetter } from "@/components/mass-transit/approval-letter";

export const metadata = {
  title: "Mass Transit Approval Letter — Ministry of Transport",
};

/**
 * The letter goes to the COMPANY. Each terminal gets its own certificate,
 * listed here so the operator can see which parks the approval covers.
 */
export default async function MassTransitLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authz = await authorize([
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS",
    "SYSTEM_ADMIN",
    "ADMIN",
    "ICT_OFFICER",
  ]);
  if (!authz.ok) redirect("/unauthorized");

  const company = await db.massTransitCompany.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      contactPerson: true,
      permitNumber: true,
      permitIssuedAt: true,
      permitExpiresAt: true,
      monthlyLevyAmount: true,
      approvedColour: true,
      currentFleetSize: true,
      minFleetSize: true,
      applicationStatus: true,
      terminals: {
        orderBy: { terminalNumber: "asc" },
        select: {
          terminalNumber: true,
          locationAddress: true,
          motorPark: { select: { parkId: true } },
        },
      },
    },
  });
  if (!company) notFound();

  const isTemporal = company.applicationStatus === "TEMPORAL_APPROVAL";
  const validityMonths =
    (await getNumberSetting(
      isTemporal
        ? "masstransit.validity.temporalMonths"
        : "masstransit.validity.permanentMonths",
    )) || (isTemporal ? 6 : 12);

  return (
    <div className="flex flex-col items-center gap-4 bg-slate-900/5 p-4 dark:bg-slate-950 sm:p-8 print:bg-white print:p-0">
      <Link
        href={`/fleet-operators/${company.id}`}
        className="inline-flex w-full max-w-[210mm] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>

      <MassTransitApprovalLetter
        data={{
          id: company.id,
          companyName: company.companyName,
          contactPerson: company.contactPerson,
          contactAddress: null,
          permitNumber: company.permitNumber,
          permitIssuedAt: company.permitIssuedAt,
          permitExpiresAt: company.permitExpiresAt,
          monthlyLevyAmount: company.monthlyLevyAmount,
          approvedColour: company.approvedColour,
          fleetSize: company.currentFleetSize || company.minFleetSize || 0,
          terminals: company.terminals.map((t) => ({
            designation: terminalDesignation(company.companyName, t.terminalNumber),
            location: t.locationAddress,
            parkId: t.motorPark?.parkId ?? null,
          })),
          approvalType: isTemporal ? "TEMPORAL" : "PERMANENT",
          validityMonths,
        }}
        signature={SIGNATURES.commissioner}
        showActions
      />
    </div>
  );
}
