/**
 * Motor Park Detail Page — Ministry of Transport Platform
 * STORY-023 (partial) | FR-011 through FR-019
 *
 * Hub page for a single motor park application.
 * Shows: full application details, inspection history, fee history,
 *        and role-based action buttons that advance the workflow.
 *
 * Role matrix:
 *  EXTERNAL_APPLICANT   — view own park + "Request Re-Inspection" (after PTB issued)
 *  HOD_PARKS / HOD_VIS  — view all + "Schedule Inspection" button
 *  FIELD_INSPECTOR      — view assigned + "Submit Inspection Report"
 *  COMMISSIONER / PS    — view all + "Issue Permit to Build" / "Issue Final Approval"
 *  FINANCE_OFFICER      — view all
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getMotorPark, type MotorParkDetail } from "@/app/actions/motor-park";
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
import { RowGrid as Row } from "@/components/ui/row";
import { fmtDateShort as fmt, formatNaira as naira } from "@/lib/utils/format";

// ── Status-based workflow actions ──────────────────────────────────────────────

function ActionBar({ park, role }: { park: MotorParkDetail; role: string }) {
  const status = park.applicationStatus;

  const canSchedule =
    [
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
    ].includes(role) &&
    ["SUBMITTED", "UNDER_REVIEW", "INSPECTION_COMPLETED"].includes(status);

  const canInspect =
    role === "FIELD_INSPECTOR" &&
    status === "INSPECTION_SCHEDULED" &&
    park.inspections.some((i) => i.status === "SCHEDULED");

  const canIssuePTB =
    ["COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    status === "INSPECTION_COMPLETED";

  const canIssueFinal =
    ["COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    status === "PENDING_APPROVAL";

  const canRequestReinspection =
    role === "EXTERNAL_APPLICANT" &&
    status === "APPROVED" &&
    park.permitStatus === "ACTIVE";

  const canUploadDocuments =
    role === "EXTERNAL_APPLICANT" &&
    ["SUBMITTED", "UNDER_REVIEW"].includes(status) &&
    !(park.cacDocumentId || park.landOwnershipDocId);

  const canProximityEval =
    [
      "FIELD_INSPECTOR",
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
    ].includes(role) && status === "INSPECTION_COMPLETED";

  const canInitiateRevalidation =
    ["HOD_PARKS", "COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    park.permitStatus === "ACTIVE";

  const pendingFee = park.fees?.find((f) => f.status === "PENDING");

  const canAssessFees =
    ["FINANCE_OFFICER", "COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    !["REVOKED", "REJECTED"].includes(status) &&
    !pendingFee;
  const canPayFee = role === "EXTERNAL_APPLICANT" && !!pendingFee;

  const canRevoke =
    ["COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    park.permitStatus === "ACTIVE";

  const pendingInspection = park.inspections.find(
    (i) => i.status === "SCHEDULED",
  );

  if (
    !canSchedule &&
    !canInspect &&
    !canIssuePTB &&
    !canIssueFinal &&
    !canRequestReinspection &&
    !canUploadDocuments &&
    !canProximityEval &&
    !canInitiateRevalidation &&
    !canAssessFees &&
    !canPayFee &&
    !canRevoke
  ) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-primary">
          Available Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {canSchedule && (
          <Button asChild size="sm">
            <Link href={`/motor-parks/${park.id}/schedule-inspection`}>
              Schedule Inspection
            </Link>
          </Button>
        )}
        {canInspect && pendingInspection && (
          <Button asChild size="sm">
            <Link
              href={`/motor-parks/${park.id}/inspect/${pendingInspection.id}`}>
              Submit Inspection Report
            </Link>
          </Button>
        )}
        {canIssuePTB && (
          <Button asChild size="sm">
            <Link href={`/motor-parks/${park.id}/issue-permit`}>
              Issue Permit to Build
            </Link>
          </Button>
        )}
        {canIssueFinal && (
          <Button asChild size="sm">
            <Link href={`/motor-parks/${park.id}/issue-final-approval`}>
              Issue Final Approval
            </Link>
          </Button>
        )}
        {canUploadDocuments && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/motor-parks/${park.id}/upload-documents`}>
              Upload Documents
            </Link>
          </Button>
        )}
        {canProximityEval && (
          <Button asChild size="sm">
            <Link href={`/motor-parks/${park.id}/proximity-evaluation`}>
              Proximity Evaluation
            </Link>
          </Button>
        )}
        {canInitiateRevalidation && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/motor-parks/${park.id}/initiate-revalidation`}>
              Initiate Revalidation
            </Link>
          </Button>
        )}
        {canRequestReinspection && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/motor-parks/${park.id}/request-reinspection`}>
              Request Re-Inspection
            </Link>
          </Button>
        )}
        {canAssessFees && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/motor-parks/${park.id}/assess-fees`}>
              Record Fee / Levy
            </Link>
          </Button>
        )}
        {canPayFee && pendingFee && (
          <Button asChild size="sm">
            <Link href={`/motor-parks/${park.id}/pay?feeId=${pendingFee.id}`}>
              Pay Fee
            </Link>
          </Button>
        )}
        {canRevoke && (
          <Button asChild size="sm" variant="destructive">
            <Link href={`/motor-parks/${park.id}/revoke`}>Revoke Permit</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Inspection history ─────────────────────────────────────────────────────────

function InspectionHistory({
  inspections,
}: {
  inspections: MotorParkDetail["inspections"];
}) {
  if (inspections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No inspections recorded yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {inspections.map((ins) => (
        <div
          key={ins.id}
          className="flex flex-col gap-1 p-3 rounded-lg border border-border/50 bg-secondary/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {ins.inspectionType.replace(/_/g, " ")} Inspection
            </span>
            <StatusPill status={ins.status} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
            <span className="text-xs text-muted-foreground">
              Scheduled: {fmt(ins.scheduledDate)}
            </span>
            {ins.completedAt && (
              <span className="text-xs text-muted-foreground">
                Completed: {fmt(ins.completedAt)}
              </span>
            )}
            <span className="text-xs text-muted-foreground col-span-2">
              Inspector: {ins.assignedTo.firstName} {ins.assignedTo.lastName}
            </span>
            {ins.recommendedAction && (
              <span className="text-xs text-muted-foreground col-span-2">
                Recommendation:{" "}
                <span className="text-foreground font-medium">
                  {ins.recommendedAction}
                </span>
              </span>
            )}
            {ins.overallAssessment && (
              <p className="text-xs text-muted-foreground col-span-2 mt-1 italic">
                &ldquo;{ins.overallAssessment}&rdquo;
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Fee history ────────────────────────────────────────────────────────────────

function FeeHistory({ fees }: { fees: MotorParkDetail["fees"] }) {
  if (fees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No fee assessments recorded yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {fees.map((fee) => (
        <div
          key={fee.id}
          className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {fee.feeType.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-muted-foreground">
              Due: {fmt(fee.dueDate)}
              {fee.paidAt ? ` · Paid: ${fmt(fee.paidAt)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{naira(fee.amount)}</span>
            <StatusPill status={fee.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MotorParkDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getMotorPark(id);

  if (!result.success) {
    if (result.error === "Access denied") redirect("/motor-parks");
    notFound();
  }

  const park = result.data!;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Breadcrumb + header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href="/motor-parks"
            className="hover:text-foreground transition-colors">
            Motor Parks
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">
            {park.businessName}
          </span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}>
              {park.businessName}
            </h1>
            {park.transportCompanyName && (
              <p className="text-sm text-muted-foreground">
                {park.transportCompanyName}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {park.locationAddress}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusPill status={park.applicationStatus} />
            {park.permitStatus && (
              <span className="text-xs text-muted-foreground">
                Permit: <StatusPill status={park.permitStatus} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action bar — role-gated */}
      <ActionBar park={park} role={session.role} />

      {/* Permit info — shown when permit exists */}
      {park.permitNumber && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permit Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Permit Number" value={park.permitNumber} />
            <Row label="Issued" value={fmt(park.permitIssuedAt)} />
            <Row label="Expires" value={fmt(park.permitExpiresAt)} />
            {park.nextRevalidationDue && (
              <Row
                label="Next Revalidation"
                value={fmt(park.nextRevalidationDue)}
              />
            )}
            {park.assessedFeeAmount && (
              <Row label="Annual Fee" value={naira(park.assessedFeeAmount)} />
            )}
            {park.monthlyLevyAmount && (
              <Row label="Monthly Levy" value={naira(park.monthlyLevyAmount)} />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Details</CardTitle>
            <CardDescription>Submitted {fmt(park.appliedAt)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Row label="Business Name" value={park.businessName} />
            <Row label="Transport Company" value={park.transportCompanyName} />
            <Row label="CAC Reg. No." value={park.cacRegistrationNumber} />
            <Row label="ANSSID Number" value={park.anssidNumber} />
            <Row label="Location" value={park.locationAddress} />
            {park.gpsCoordinates && (
              <Row label="GPS Coordinates" value={park.gpsCoordinates} />
            )}
            {park.approvedAt && (
              <Row label="Approved" value={fmt(park.approvedAt)} />
            )}
            {park.revokedAt && (
              <>
                <Row label="Revoked" value={fmt(park.revokedAt)} />
                <Row label="Reason" value={park.revocationReason} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
            <CardDescription>
              Applicant: {park.applicant.firstName} {park.applicant.lastName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Row label="Park Manager" value={park.contactPerson} />
            <Row label="Phone" value={park.contactPhone} />
            <Row label="Email" value={park.contactEmail} />
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Applicant Account
            </p>
            <Row
              label="Name"
              value={`${park.applicant.firstName} ${park.applicant.lastName}`}
            />
            <Row label="Email" value={park.applicant.email} />
          </CardContent>
        </Card>
      </div>

      {/* Inspection history */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Inspection History</CardTitle>
              <CardDescription>
                {park.inspections.length} inspection
                {park.inspections.length !== 1 ? "s" : ""} recorded
              </CardDescription>
            </div>
            {[
              "HOD_PARKS",
              "HOD_VIS",
              "HOD_TRANSPORT_OPS",
              "HOD_PARKS_REVALIDATION",
            ].includes(session.role) && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/motor-parks/${park.id}/schedule-inspection`}>
                  + Schedule
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <InspectionHistory inspections={park.inspections} />
        </CardContent>
      </Card>

      {/* Fee history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fee Assessments</CardTitle>
          <CardDescription>
            {park.fees.length} assessment{park.fees.length !== 1 ? "s" : ""}{" "}
            recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeeHistory fees={park.fees} />
        </CardContent>
      </Card>
    </div>
  );
}
