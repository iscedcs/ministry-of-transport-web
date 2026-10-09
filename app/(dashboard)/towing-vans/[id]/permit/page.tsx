import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession, authorize } from "@/lib/auth";
import { TOWING_BASE_VIEW_ROLES } from "@/lib/towing-roles";
import { getTowingVan } from "@/app/actions/towing";
import { SIGNATURES } from "@/lib/signatures";
import { TowingPermit } from "@/components/towing/towing-permit";

export const metadata = {
  title: "Towing Permit — Ministry of Transport",
};

export default async function TowingPermitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const authz = await authorize(TOWING_BASE_VIEW_ROLES);
  if (!authz.ok) redirect("/unauthorized");

  const { id } = await params;
  const result = await getTowingVan(id);
  if (!result.success) notFound();
  const van = result.van;

  return (
    <div className="flex flex-col items-center gap-4 bg-slate-900/5 p-4 dark:bg-slate-950 sm:p-8 print:bg-white print:p-0">
      <Link
        href={`/towing-vans/${van.id}`}
        className="inline-flex w-full max-w-[210mm] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" />
        Back to towing van
      </Link>

      <TowingPermit
        data={{
          id: van.id,
          permitNumber: van.permitNumber,
          plateNumber: van.plateNumber,
          vehicleType: van.vehicleType,
          make: van.make,
          model: van.model,
          color: van.color,
          operatorName: van.operatorName,
          operatorPhone: van.operatorPhone,
          hasAssistant: van.hasAssistant,
          assistantName: van.assistantName,
          lgaName: van.lga?.name ?? null,
          issuedAt: van.permitIssuedAt,
        }}
        signature={SIGNATURES.commissioner}
        showActions
      />
    </div>
  );
}
