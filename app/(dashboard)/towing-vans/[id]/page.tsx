import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck, FileText, Pencil } from "lucide-react";
import { getSession } from "@/lib/auth";
import { TOWING_ISSUE_ROLES, TOWING_BASE_WRITE_ROLES } from "@/lib/towing-roles";
import { getTowingVan } from "@/app/actions/towing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { RowGrid as Row } from "@/components/ui/row";
import { fmtDateShort as fmt } from "@/lib/utils/format";
import IssuePermitButton from "./issue-permit-button";

export const metadata = {
  title: "Towing Van — Ministry of Transport",
};

export default async function TowingVanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getTowingVan(id);
  if (!result.success) notFound();

  const van = result.van;
  const canIssue = TOWING_ISSUE_ROLES.includes(session.role) && van.status === "REGISTERED";
  const canEdit = TOWING_BASE_WRITE_ROLES.includes(session.role);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link
        href="/towing-vans"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Towing Vans
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Truck className="h-5 w-5 text-primary" />
            {van.plateNumber}
          </h1>
          {van.permitNumber && (
            <p className="text-sm text-muted-foreground mt-1 font-mono">{van.permitNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={van.status} />
          {canEdit && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/towing-vans/${van.id}/edit`}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {canIssue && <IssuePermitButton towingVanId={van.id} />}

      {van.status === "PERMIT_ISSUED" && (
        <Button asChild size="sm" variant="outline" className="w-fit">
          <Link href={`/towing-vans/${van.id}/permit`} target="_blank">
            <FileText className="w-4 h-4 mr-2" />
            View Towing Permit
          </Link>
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="Plate Number" value={van.plateNumber} />
          <Row label="Vehicle Type" value={van.vehicleType} />
          <Row label="Chassis Number" value={van.chassisNumber} />
          <Row label="Make" value={van.make} />
          <Row label="Model" value={van.model} />
          <Row label="Colour" value={van.color} />
          <Row label="Sticker Number" value={van.stickerNumber} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operator</CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="Name" value={van.operatorName} />
          <Row label="Phone" value={van.operatorPhone} />
          <Row label="Address" value={van.operatorAddress} />
          <Row label="Gender" value={van.operatorGender} />
          <Row label="Area of Operation" value={van.lga?.name ?? null} />
        </CardContent>
      </Card>

      {van.hasAssistant && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Name" value={van.assistantName} />
            <Row label="Phone" value={van.assistantPhone} />
          </CardContent>
        </Card>
      )}

      {van.associationMember && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Association</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Association" value={van.associationName} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permit</CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="Permit Number" value={van.permitNumber} />
          <Row label="Issued" value={van.permitIssuedAt ? fmt(van.permitIssuedAt) : null} />
          <Row label="Registered" value={fmt(van.createdAt)} />
        </CardContent>
      </Card>
    </div>
  );
}
