import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User, Truck, FileText, Pencil, Plus, AlertTriangle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { LOGISTICS_BASE_WRITE_ROLES, LOGISTICS_EDIT_ROLES } from "@/lib/logistics-roles";
import { getLogisticsApplicant } from "@/app/actions/logistics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { RowGrid as Row } from "@/components/ui/row";
import { fmtDateShort as fmt } from "@/lib/utils/format";
import LogisticsWorkflowActions from "./workflow-actions";
import AddVehicleButton from "./add-vehicle-button";

export const metadata = {
  title: "Logistics Applicant — Ministry of Transport",
};

const naira = (kobo: number | null) =>
  kobo == null ? null : `₦${(kobo / 100).toLocaleString("en-NG")}`;

export default async function LogisticsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getLogisticsApplicant(id);
  if (!result.success) notFound();

  const applicant = result.applicant;
  const canEdit = LOGISTICS_EDIT_ROLES.includes(session.role);
  const canAddVehicle = LOGISTICS_BASE_WRITE_ROLES.includes(session.role);
  const isCompany = applicant.applicantType === "COMPANY";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link
        href="/logistics"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Logistics
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            {isCompany ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
            {isCompany ? applicant.companyName : applicant.contactPerson}
          </h1>
          {applicant.permitNumber && (
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {applicant.permitNumber}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={applicant.applicationStatus} />
          {canEdit && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/logistics/${applicant.id}/edit`}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {applicant.applicationStatus === "REJECTED" && applicant.rejectionReason && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="whitespace-pre-wrap">{applicant.rejectionReason}</p>
        </div>
      )}

      <LogisticsWorkflowActions
        applicantId={applicant.id}
        status={applicant.applicationStatus}
        role={session.role}
        monthlyFeeAmount={applicant.monthlyFeeAmount}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isCompany ? "Company" : "Operator"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isCompany && (
            <>
              <Row label="Company Name" value={applicant.companyName} />
              <Row label="CAC Number" value={applicant.cacNumber} />
            </>
          )}
          <Row label="Contact Person" value={applicant.contactPerson} />
          <Row label="Phone" value={applicant.contactPhone} />
          <Row label="Email" value={applicant.contactEmail} />
          <Row label="Address" value={applicant.address} />
          <Row label="Monthly Fee" value={naira(applicant.monthlyFeeAmount)} />
          <Row label="Registered" value={fmt(applicant.createdAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Vehicles ({applicant.vehicles.length})
          </CardTitle>
          {canAddVehicle && isCompany && <AddVehicleButton applicantId={applicant.id} />}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {applicant.vehicles.map((v) => (
            <div key={v.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono font-semibold">{v.plateNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.vehicleType}
                    {v.make || v.model ? ` · ${[v.make, v.model].filter(Boolean).join(" ")}` : ""}
                    {v.color ? ` · ${v.color}` : ""}
                  </p>
                </div>
                {applicant.applicationStatus === "APPROVED" && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/logistics/${applicant.id}/letter/${v.id}`} target="_blank">
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Letter
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
