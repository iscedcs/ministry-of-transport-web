import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession, authorize } from "@/lib/auth";
import { LOGISTICS_BASE_VIEW_ROLES } from "@/lib/logistics-roles";
import { getLogisticsApplicant } from "@/app/actions/logistics";
import { SIGNATURES } from "@/lib/signatures";
import { LogisticsLetter } from "@/components/logistics/logistics-letter";

export const metadata = {
  title: "Logistics Letter — Ministry of Transport",
};

export default async function LogisticsLetterPage({
  params,
}: {
  params: Promise<{ id: string; vehicleId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const authz = await authorize(LOGISTICS_BASE_VIEW_ROLES);
  if (!authz.ok) redirect("/unauthorized");

  const { id, vehicleId } = await params;
  const result = await getLogisticsApplicant(id);
  if (!result.success) notFound();

  const applicant = result.applicant;
  const vehicle = applicant.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) notFound();

  return (
    <div className="flex flex-col items-center gap-4 bg-slate-900/5 p-4 dark:bg-slate-950 sm:p-8 print:bg-white print:p-0">
      <Link
        href={`/logistics/${applicant.id}`}
        className="inline-flex w-full max-w-[210mm] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>

      <LogisticsLetter
        data={{
          id: applicant.id,
          permitNumber: applicant.permitNumber,
          applicantType: applicant.applicantType,
          companyName: applicant.companyName,
          contactPerson: applicant.contactPerson,
          address: applicant.address,
          monthlyFeeAmount: applicant.monthlyFeeAmount,
          issuedAt: applicant.permitIssuedAt,
          vehicle: {
            plateNumber: vehicle.plateNumber,
            vehicleType: vehicle.vehicleType,
          },
        }}
        signature={SIGNATURES.commissioner}
        showActions
      />
    </div>
  );
}
