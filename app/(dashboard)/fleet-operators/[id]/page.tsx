/**
 * Fleet Operator Detail Page — Ministry of Transport Platform
 * STORY-051 | FR-020 through FR-029
 *
 * Hub page for a single fleet operator application.
 * Shows: company details, vehicle fleet, drivers, inspection history,
 *        and role-based action buttons.
 *
 * Role matrix:
 *  EXTERNAL_APPLICANT   — view own company + Add Vehicle, Fleet Change
 *  HOD_PARKS/HOD_PARKS_REVALIDATION — Schedule Inspection, Initiate Renewal
 *  FIELD_INSPECTOR      — Submit Inspection Report (via inspect route)
 *  COMMISSIONER / PS    — Approve Branding, Issue Permit, Generate QR, Issue Driver Card
 *  FINANCE_OFFICER      — view all
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  getFleetApplication,
  type FleetApplicationDetail,
} from "@/app/actions/mass-transit";
import { StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RowGrid as Row } from "@/components/ui/row";
import { fmtDateShort as fmt } from "@/lib/utils/format";
import { FileText, Download } from "lucide-react";

// ── Action Bar ─────────────────────────────────────────────────────────────────

function ActionBar({
  company,
  role,
}: {
  company: FleetApplicationDetail;
  role: string;
}) {
  const status = company.applicationStatus;
  const pendingInspection = company.inspections.find(
    (i) => i.status === "SCHEDULED",
  );

  const canScheduleInspection =
    [
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
    ].includes(role) &&
    ["SUBMITTED", "UNDER_REVIEW", "INSPECTION_COMPLETED"].includes(status);

  const canInspect =
    role === "FIELD_INSPECTOR" &&
    status === "INSPECTION_SCHEDULED" &&
    !!pendingInspection;

  const canApproveBranding =
    ["COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    status === "INSPECTION_COMPLETED" &&
    !company.approvedColour;

  const canIssuePermit =
    ["COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    ["INSPECTION_COMPLETED", "PENDING_APPROVAL"].includes(status);

  const canGenerateQR =
    ["COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    status === "APPROVED" &&
    company.permitStatus === "ACTIVE" &&
    company.vehicles.some((v) => !v.qrCodeId);

  const canIssueDriverCard =
    ["COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    status === "APPROVED" &&
    company.drivers.some((d) => !d.proficiencyCardId);

  const canAddVehicle =
    role === "EXTERNAL_APPLICANT" &&
    ["SUBMITTED", "UNDER_REVIEW"].includes(status);

  const canFleetChange =
    role === "EXTERNAL_APPLICANT" &&
    status === "APPROVED" &&
    company.permitStatus === "ACTIVE";

  const canInitiateRenewal =
    [
      "HOD_PARKS",
      "HOD_PARKS_REVALIDATION",
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
    ].includes(role) && company.permitStatus === "ACTIVE";

  const canPayRegistration =
    role === "EXTERNAL_APPLICANT" &&
    !company.registrationFeePaid &&
    [
      "SUBMITTED",
      "UNDER_REVIEW",
      "INSPECTION_COMPLETED",
      "PENDING_APPROVAL",
    ].includes(status);

  if (
    !canScheduleInspection &&
    !canInspect &&
    !canApproveBranding &&
    !canIssuePermit &&
    !canGenerateQR &&
    !canIssueDriverCard &&
    !canAddVehicle &&
    !canFleetChange &&
    !canInitiateRenewal &&
    !canPayRegistration
  ) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Available Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {canScheduleInspection && (
          <Button asChild size="sm">
            <Link href={`/fleet-operators/${company.id}/schedule-inspection`}>
              📅 Schedule Inspection
            </Link>
          </Button>
        )}
        {canInspect && (
          <Button asChild size="sm">
            <Link
              href={`/fleet-operators/${company.id}/inspect/${pendingInspection!.id}`}>
              🔍 Submit Inspection Report
            </Link>
          </Button>
        )}
        {canApproveBranding && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/fleet-operators/${company.id}/approve-branding`}>
              🎨 Approve Branding Scheme
            </Link>
          </Button>
        )}
        {canIssuePermit && (
          <Button asChild size="sm">
            <Link href={`/fleet-operators/${company.id}/issue-permit`}>
              📜 Issue Permit to Operate
            </Link>
          </Button>
        )}
        {canGenerateQR && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/fleet-operators/${company.id}/generate-qr`}>
              📲 Generate Vehicle QR Codes
            </Link>
          </Button>
        )}
        {canIssueDriverCard && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/fleet-operators/${company.id}/issue-driver-card`}>
              🪪 Issue Driver Cards
            </Link>
          </Button>
        )}
        {canAddVehicle && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/fleet-operators/${company.id}/add-vehicle`}>
              🚌 Add Vehicle
            </Link>
          </Button>
        )}
        {canFleetChange && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/fleet-operators/${company.id}/fleet-change`}>
              🔄 Fleet Change Notification
            </Link>
          </Button>
        )}
        {canInitiateRenewal && (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/fleet-operators/${company.id}/initiate-renewal`}>
              🔁 Initiate Annual Renewal
            </Link>
          </Button>
        )}
        {canPayRegistration && (
          <Button asChild size="sm">
            <Link href={`/fleet-operators/${company.id}/pay`}>
              Pay Registration Fee
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FleetOperatorDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getFleetApplication(id);

  if (!result.success) {
    if (result.error === "Access denied") redirect("/fleet-operators");
    notFound();
  }

  const co = result.data!;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link href="/fleet-operators" className="hover:underline">
          Fleet Operators
        </Link>
        {" / "}
        <span>{co.companyName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {co.companyName}
          </h1>
          {co.permitNumber && (
            <p className="text-sm text-muted-foreground mt-1">
              Permit: <span className="font-mono">{co.permitNumber}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={co.applicationStatus} />
          {co.permitStatus && <StatusPill status={co.permitStatus} />}
        </div>
      </div>

      {/* Action Bar */}
      <ActionBar company={co} role={session.role} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Company Name" value={co.companyName} />
            <Row label="CAC Number" value={co.cacNumber} />
            <Row label="ASIN Number" value={co.asinNumber} />
            <Row
              label="Business Premises Cert"
              value={co.businessPremisesCert}
            />
            <Row label="ANSAA Registration" value={co.ansaaRegistration} />
          </CardContent>
        </Card>

        {/* Terminals */}
        {co.terminals && co.terminals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Terminals ({co.terminals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {co.terminals.map((terminal, idx) => (
                <div
                  key={terminal.id}
                  className="border-l-4 border-primary/30 pl-4 space-y-2">
                  <h4 className="font-semibold">Terminal {idx + 1}</h4>
                  <Row label="Location Address" value={terminal.locationAddress} />
                  {terminal.gpsCoordinates && (
                    <Row label="GPS Coordinates" value={terminal.gpsCoordinates} />
                  )}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Manager Details
                    </p>
                    <Row label="Manager Name" value={terminal.managerName} />
                    <Row label="Phone" value={terminal.managerPhone} />
                    <Row label="Email" value={terminal.managerEmail} />
                    <Row
                      label="Residential Address"
                      value={terminal.managerResidentialAddress}
                    />
                  </div>
                  {idx < co.terminals.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Contact & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact & Permit Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Contact Person" value={co.contactPerson} />
            <Row label="Phone" value={co.contactPhone} />
            <Row label="Email" value={co.contactEmail} />
            <Separator className="my-2" />
            <Row label="Applied" value={fmt(co.appliedAt)} />
            <Row label="Approved" value={fmt(co.approvedAt)} />
            <Row label="Permit Issued" value={fmt(co.permitIssuedAt)} />
            <Row label="Permit Expires" value={fmt(co.permitExpiresAt)} />
            <Row label="Next Renewal Due" value={fmt(co.nextRevalidationDue)} />
            <Row
              label="Approved Brand Colour"
              value={
                co.approvedColour ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: co.approvedColour }}
                    />
                    {co.approvedColour}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">
                    Not yet approved
                  </span>
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      {co.documents && (Object.values(co.documents).some(Boolean)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uploaded Documents</CardTitle>
            <CardDescription>
              Documents submitted during application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {co.documents.cac && (
                <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-secondary/20">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium">CAC Certificate</span>
                      <span className="text-xs text-muted-foreground truncate">{co.documents.cac.fileName}</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="shrink-0">
                    <a href={co.documents.cac.fileUrl} target="_blank" rel="noreferrer">
                      <Download className="w-4 h-4 mr-2" /> View
                    </a>
                  </Button>
                </div>
              )}
              {co.documents.land && (
                <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-secondary/20">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium">Land Ownership/Lease</span>
                      <span className="text-xs text-muted-foreground truncate">{co.documents.land.fileName}</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="shrink-0">
                    <a href={co.documents.land.fileUrl} target="_blank" rel="noreferrer">
                      <Download className="w-4 h-4 mr-2" /> View
                    </a>
                  </Button>
                </div>
              )}
              {co.documents.asin && (
                <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-secondary/20">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium">Corporate ASIN</span>
                      <span className="text-xs text-muted-foreground truncate">{co.documents.asin.fileName}</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="shrink-0">
                    <a href={co.documents.asin.fileUrl} target="_blank" rel="noreferrer">
                      <Download className="w-4 h-4 mr-2" /> View
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Fleet */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Vehicle Fleet ({co.currentFleetSize} vehicles)
              </CardTitle>
              <CardDescription>
                Registered vehicles in this fleet
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {co.vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-4">
              No vehicles registered.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Reg. No.
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                      Type / Make
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                      Engine No.
                    </th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                      QR Code
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {co.vehicles.map((v, i) => (
                    <tr
                      key={v.id}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {v.registrationNumber}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <div>{v.vehicleType}</div>
                        <div className="text-xs text-muted-foreground">
                          {v.make} {v.model}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs hidden md:table-cell">
                        {v.engineNumber}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {v.qrCodeId ? (
                          <Badge
                            variant="outline"
                            className="text-xs text-green-700 border-green-300">
                            ✓ Generated
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={v.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drivers */}
      {co.drivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Drivers ({co.drivers.length})
            </CardTitle>
            <CardDescription>Registered drivers for this fleet</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                      License No.
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                      Phone
                    </th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                      Proficiency Card
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {co.drivers.map((d, i) => (
                    <tr
                      key={d.id}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-4 py-2.5 font-medium">{d.fullName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs hidden sm:table-cell">
                        {d.licenseNumber}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        {d.phoneNumber}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {d.proficiencyCardId ? (
                          <Badge
                            variant="outline"
                            className="text-xs text-green-700 border-green-300">
                            ✓ Issued
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspection History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspection History</CardTitle>
          <CardDescription>Terminal / depot inspection records</CardDescription>
        </CardHeader>
        <CardContent>
          {co.inspections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No inspections scheduled yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {co.inspections.map((insp) => (
                <div
                  key={insp.id}
                  className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <StatusPill status={insp.status} />
                      <span className="font-medium">{insp.inspectionType}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {fmt(insp.scheduledDate)}
                    </span>
                  </div>
                  <div className="mt-1 text-muted-foreground text-xs">
                    Inspector: {insp.assignedTo.firstName}{" "}
                    {insp.assignedTo.lastName}
                    {insp.completedAt &&
                      ` · Completed ${fmt(insp.completedAt)}`}
                  </div>
                  {insp.recommendedAction && (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        Rec: {insp.recommendedAction}
                      </Badge>
                    </div>
                  )}
                  {insp.overallAssessment && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {insp.overallAssessment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
