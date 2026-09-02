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
import { db } from "@/lib/db";
import { getRevalidationForPark } from "@/lib/park-approval-origin";
import { OwnerCompletionPanel } from "@/components/field-capture/owner-completion-panel";
import {
  getMotorPark,
  verifyDocument,
  type MotorParkDetail,
} from "@/app/actions/motor-park";
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
import {
  FileText,
  Download,
  Eye,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { MotorParkWorkflowActions } from "./motor-park-workflow-actions";
import { canSchedule as canScheduleInspectionRole } from "@/lib/workflow-roles";

// ── Status-based workflow actions ──────────────────────────────────────────────

function ActionBar({
  park,
  role,
  revalidationId,
}: {
  park: MotorParkDetail;
  role: string;
  /** Set when this park's approval came from the revalidation chain. */
  revalidationId?: string | null;
}) {
  const status = park.applicationStatus;

  const pendingApplicationFee = park.fees?.find(
    (f) => f.feeType === "APPLICATION" && f.status === "PENDING",
  );
  const canSchedule =
    canScheduleInspectionRole(role) &&
    ["SUBMITTED", "UNDER_REVIEW", "INSPECTION_COMPLETED"].includes(status) &&
    !pendingApplicationFee;

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
    [
      "FINANCE_OFFICER",
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_PARKS",
    ].includes(role) &&
    !["REVOKED", "REJECTED"].includes(status) &&
    !pendingFee;
  const canPayFee = role === "EXTERNAL_APPLICANT" && !!pendingFee;

  const canIssueTemporal =
    ["COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    (status === "INSPECTION_COMPLETED" || status === "PENDING_APPROVAL");

  const canDownloadTemporal = status === "TEMPORAL_APPROVAL";

  const canRevoke =
    ["COMMISSIONER", "PERMANENT_SECRETARY"].includes(role) &&
    park.permitStatus === "ACTIVE";

  const canManageStaff =
    (status === "APPROVED" || status === "TEMPORAL_APPROVAL") &&
    [
      "EXTERNAL_APPLICANT",
      "HOD_PARKS",
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
    ].includes(role);

  const pendingInspection = park.inspections.find(
    (i) => i.status === "SCHEDULED",
  );

  const canEdit = [
    "ADMIN",
    "SYSTEM_ADMIN",
    "HOD_PARKS",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
  ].includes(role);

  if (
    !canEdit &&
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
    !canRevoke &&
    !canIssueTemporal &&
    !canDownloadTemporal &&
    !canManageStaff
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
        {canIssueTemporal && (
          <Button asChild size="sm">
            <Link href={`/motor-parks/${park.id}/issue-temporal-approval`}>
              Issue Temporary Approval
            </Link>
          </Button>
        )}
        {canDownloadTemporal && !revalidationId && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10">
            <Link
              href={`/motor-parks/${park.id}/temporal-certificate`}
              target="_blank">
              <Download className="w-4 h-4 mr-2" /> Download Temporary
              Certificate
            </Link>
          </Button>
        )}
        {revalidationId && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10">
            <Link
              href={`/revalidation/${revalidationId}/certificate`}
              target="_blank">
              <Download className="w-4 h-4 mr-2" /> Revalidation Certificate
            </Link>
          </Button>
        )}
        {canIssueFinal && !revalidationId && (
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
        {canManageStaff && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10">
            <Link href={`/motor-parks/${park.id}/staff`}>
              Manage Park Staff
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
        {canEdit && (
          <Button asChild size="sm" variant="outline" className="border-border">
            <Link href={`/motor-parks/${park.id}/edit`}>
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Edit Application
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

            {ins.status === "COMPLETED" &&
              ins.checklist &&
              ins.checklist.length > 0 && (
                <div className="col-span-2 mt-3 pt-3 border-t border-border/30">
                  <details className="group">
                    <summary className="flex items-center justify-between text-xs font-semibold text-primary cursor-pointer hover:underline list-none select-none">
                      <span>
                        View Checklist & Evidence Photos ({ins.checklist.length}{" "}
                        items)
                      </span>
                      <span className="transition-transform duration-200 group-open:rotate-180">
                        ▼
                      </span>
                    </summary>
                    <div className="mt-3 flex flex-col gap-3 pl-2 border-l-2 border-primary/20">
                      {ins.checklist.map((item) => {
                        let pUrl = "";
                        if (item.photoUrls) {
                          try {
                            const parsed = JSON.parse(item.photoUrls);
                            pUrl = Array.isArray(parsed) ? parsed[0] : parsed;
                          } catch {
                            pUrl = item.photoUrls;
                          }
                        }
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col gap-1.5 p-2.5 rounded bg-background border border-border/40 text-xs">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-foreground">
                                  {item.checklistItem.itemName}
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                  {item.checklistItem.itemCategory.replace(
                                    /_/g,
                                    " ",
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.isCompliant
                                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                                      : "bg-destructive/10 text-destructive border border-destructive/20"
                                  }`}>
                                  {item.isCompliant ? "Yes" : "No"}
                                </span>
                                {item.score !== null && (
                                  <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground text-[10px] font-semibold">
                                    {item.score} /{" "}
                                    {item.checklistItem.maxPoints} pts
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.checklistItem.description && (
                              <p className="text-[11px] text-muted-foreground">
                                {item.checklistItem.description}
                              </p>
                            )}

                            {item.notes && (
                              <div className="bg-secondary/20 p-2 rounded text-[11px] border-l-2 border-border italic text-muted-foreground">
                                <strong>Inspector Remarks:</strong> &quot;
                                {item.notes}&quot;
                              </div>
                            )}

                            {pUrl && (
                              <div className="mt-1 flex flex-col gap-1">
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  Evidence Photo:
                                </span>
                                <div className="relative aspect-[4/3] w-32 rounded border border-border overflow-hidden bg-muted group/img">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={pUrl}
                                    alt="Inspection Evidence"
                                    className="object-cover w-full h-full"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a
                                      href={pUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                                      title="Open photo in new tab">
                                      <Eye className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
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

  // A record an Enumerator captured has no owner yet. Only the officers who
  // complete it need to see the panel.
  // A park whose approval came from revalidation is offered its certificate,
  // not a motor park letter it never received.
  const revalidationOrigin = await getRevalidationForPark(id);

  const capture = await db.motorPark.findUnique({
    where: { id },
    select: {
      capturedByUserId: true,
      contactUserId: true,
      contactPerson: true,
      contactPhone: true,
      contactEmail: true,
      managerResidentialAddress: true,
      applicationStatus: true,
    },
  });
  const capturer = capture?.capturedByUserId
    ? await db.user.findUnique({
        where: { id: capture.capturedByUserId },
        select: { firstName: true, lastName: true },
      })
    : null;
  const showCompletion =
    !!capture &&
    (capture.applicationStatus === "DRAFT" || !!capture.capturedByUserId) &&
    ["HOD_TRANSPORT_OPS","HOD_PARKS_REVALIDATION","HOD_PARKS","SYSTEM_ADMIN","ADMIN"].includes(session.role);

  const canApproveDocs = [
    "HOD_PARKS",
    "HOD_PARKS_REVALIDATION",
    "HOD_VIS",
    "HOD_TRANSPORT_OPS",
    "SYSTEM_ADMIN",
  ].includes(session.role);

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
            <div className="flex items-center gap-2">
              {[
                "ADMIN",
                "SYSTEM_ADMIN",
                "HOD_PARKS",
                "HOD_TRANSPORT_OPS",
                "HOD_PARKS_REVALIDATION",
                "COMMISSIONER",
                "PERMANENT_SECRETARY",
              ].includes(session.role) && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-border text-xs">
                  <Link href={`/motor-parks/${park.id}/edit`}>
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Edit Application
                  </Link>
                </Button>
              )}
              <StatusPill status={park.applicationStatus} />
            </div>
            {park.permitStatus && (
              <span className="text-xs text-muted-foreground">
                Permit: <StatusPill status={park.permitStatus} />
              </span>
            )}
          </div>
        </div>
      </div>

      {capture?.applicationStatus === "DRAFT" && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong className="font-semibold">Draft — not yet submitted.</strong>{" "}
          This was captured in the field and is not in the approval chain. It
          becomes an application once the owner details are filled in and it is
          submitted below.
        </div>
      )}

      {showCompletion && capture && (
        <OwnerCompletionPanel
          kind="park"
          entityId={park.id}
          status={capture.applicationStatus}
          capturedBy={
            capturer ? `${capturer.firstName} ${capturer.lastName}` : null
          }
          owner={{
            contactPerson: capture.contactPerson,
            contactPhone: capture.contactPhone,
            contactEmail: capture.contactEmail,
            managerResidentialAddress: capture.managerResidentialAddress,
            hasAccount: !!capture.contactUserId,
          }}
        />
      )}

      {/* Action bar — role-gated */}
      <ActionBar
        park={park}
        role={session.role}
        revalidationId={revalidationOrigin?.id ?? null}
      />

      {/* Sequential Executive Workflow Actions */}
      <MotorParkWorkflowActions
        parkId={park.id}
        status={park.applicationStatus}
        role={session.role}
        initialMonthlyLevyKobo={park.monthlyLevyAmount}
      />

      {/* Signatures & Executive Approvals timeline card */}
      <Card className="my-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Signatures &
            Executive Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <span className="text-xs text-muted-foreground block mb-1">
              HOD Parks Sign-off
            </span>
            <p className="font-semibold text-xs text-foreground">
              {park.hodApprovedAt
                ? `✓ Signed on ${fmt(park.hodApprovedAt)}`
                : "⏳ Pending Signature"}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <span className="text-xs text-muted-foreground block mb-1">
              Permanent Secretary
            </span>
            <p className="font-semibold text-xs text-foreground">
              {park.psApprovedAt
                ? `✓ Signed on ${fmt(park.psApprovedAt)}`
                : "⏳ Pending Signature"}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <span className="text-xs text-muted-foreground block mb-1">
              Hon. Commissioner
            </span>
            <p className="font-semibold text-xs text-foreground">
              {park.commissionerApprovedAt
                ? `✓ Signed on ${fmt(park.commissionerApprovedAt)}`
                : "⏳ Pending Signature"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Temporal approval banner */}
      {park.applicationStatus === "TEMPORAL_APPROVAL" && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-700 dark:text-green-400 flex items-center gap-2">
              <span>Temporary Approval Issued</span>
            </CardTitle>
            <CardDescription>
              Your loading bay has been granted temporary approval to commence
              operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4 flex-wrap pt-1">
            <p className="text-xs text-muted-foreground max-w-xl">
              Please download the official certificate as sign-off proof. Note
              that you must improve facilities within three (3) months as
              specified in the certificate guidelines.
            </p>
            <Button
              asChild
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white">
              <Link
                href={
                  revalidationOrigin
                    ? `/revalidation/${revalidationOrigin.id}/certificate`
                    : `/motor-parks/${park.id}/temporal-certificate`
                }
                target="_blank">
                <Download className="w-4 h-4 mr-2" /> Download Certificate (PDF)
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

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

      {/* Documents */}
      {park.documents && Object.values(park.documents).some(Boolean) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uploaded Documents</CardTitle>
            <CardDescription>
              Documents submitted during application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {park.documents.cac && (
                <div className="flex flex-col p-4 border border-border/50 rounded-lg bg-secondary/20 justify-between gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium">
                          CAC Certificate
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {park.documents.cac.fileName}
                        </span>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0">
                      <a
                        href={park.documents.cac.fileUrl}
                        target="_blank"
                        rel="noreferrer">
                        <Download className="w-4 h-4 mr-2" /> View
                      </a>
                    </Button>
                  </div>

                  {/* Review / Verification Status */}
                  <div className="pt-3 border-t border-border/50 flex flex-col gap-2">
                    {park.documents.cac.verifiedAt ? (
                      <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-2.5 rounded border border-green-500/20 text-xs">
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span>✅ Reviewed & Verified</span>
                          <span>{fmt(park.documents.cac.verifiedAt)}</span>
                        </div>
                        {park.documents.cac.verificationNotes && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            <strong>Comment:</strong>{" "}
                            {park.documents.cac.verificationNotes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-500/5 text-amber-700 dark:text-amber-400 p-2.5 rounded border border-amber-500/10 text-xs flex items-center justify-between">
                        <span>⏳ Pending HOD Review</span>
                      </div>
                    )}

                    {park.documents.cac.reviews &&
                      park.documents.cac.reviews.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5 border-t border-border/30 pt-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Review Comments History
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {park.documents.cac.reviews.map((rev) => (
                              <div
                                key={rev.id}
                                className="p-2 rounded bg-secondary/30 border border-border/20 text-[11px]">
                                <div className="flex items-center justify-between font-semibold mb-0.5 text-[10px] text-muted-foreground">
                                  <span>
                                    {rev.reviewerName} (
                                    {rev.reviewerRole.replace(/_/g, " ")})
                                  </span>
                                  <span
                                    className={
                                      rev.isApproved
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-destructive"
                                    }>
                                    {rev.isApproved ? "Verified" : "Rejected"}
                                  </span>
                                </div>
                                {rev.notes && (
                                  <p className="text-foreground leading-relaxed">
                                    {rev.notes}
                                  </p>
                                )}
                                <span className="text-[9px] text-muted-foreground/85 block mt-0.5">
                                  {fmt(rev.reviewedAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {canApproveDocs && (
                      <form
                        action={async (formData) => {
                          "use server";
                          const approved = formData.get("approved") === "true";
                          const notes = formData.get("notes") as string;
                          await verifyDocument(
                            park.documents.cac!.id,
                            approved,
                            notes,
                          );
                          redirect(`/motor-parks/${park.id}`);
                        }}
                        className="flex flex-col gap-2 mt-2 bg-background p-3 rounded border border-border">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          Verification Panel
                        </span>
                        <textarea
                          name="notes"
                          placeholder="Add comments or issues observed..."
                          rows={2}
                          className="w-full text-xs p-2 rounded border bg-secondary/10"
                          required
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="submit"
                            name="approved"
                            value="false"
                            className="text-[10px] bg-destructive hover:bg-destructive/90 text-white font-semibold py-1 px-2.5 rounded transition-colors">
                            Reject Document
                          </button>
                          <button
                            type="submit"
                            name="approved"
                            value="true"
                            className="text-[10px] bg-primary hover:bg-primary/95 text-white font-semibold py-1 px-2.5 rounded transition-colors">
                            Approve & Verify
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
              {park.documents.land && (
                <div className="flex flex-col p-4 border border-border/50 rounded-lg bg-secondary/20 justify-between gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium">
                          Land Ownership/Lease
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {park.documents.land.fileName}
                        </span>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0">
                      <a
                        href={park.documents.land.fileUrl}
                        target="_blank"
                        rel="noreferrer">
                        <Download className="w-4 h-4 mr-2" /> View
                      </a>
                    </Button>
                  </div>

                  {/* Review / Verification Status */}
                  <div className="pt-3 border-t border-border/50 flex flex-col gap-2">
                    {park.documents.land.verifiedAt ? (
                      <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-2.5 rounded border border-green-500/20 text-xs">
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span>✅ Reviewed & Verified</span>
                          <span>{fmt(park.documents.land.verifiedAt)}</span>
                        </div>
                        {park.documents.land.verificationNotes && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            <strong>Comment:</strong>{" "}
                            {park.documents.land.verificationNotes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-500/5 text-amber-700 dark:text-amber-400 p-2.5 rounded border border-amber-500/10 text-xs flex items-center justify-between">
                        <span>⏳ Pending HOD Review</span>
                      </div>
                    )}

                    {park.documents.land.reviews &&
                      park.documents.land.reviews.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5 border-t border-border/30 pt-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Review Comments History
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {park.documents.land.reviews.map((rev) => (
                              <div
                                key={rev.id}
                                className="p-2 rounded bg-secondary/30 border border-border/20 text-[11px]">
                                <div className="flex items-center justify-between font-semibold mb-0.5 text-[10px] text-muted-foreground">
                                  <span>
                                    {rev.reviewerName} (
                                    {rev.reviewerRole.replace(/_/g, " ")})
                                  </span>
                                  <span
                                    className={
                                      rev.isApproved
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-destructive"
                                    }>
                                    {rev.isApproved ? "Verified" : "Rejected"}
                                  </span>
                                </div>
                                {rev.notes && (
                                  <p className="text-foreground leading-relaxed">
                                    {rev.notes}
                                  </p>
                                )}
                                <span className="text-[9px] text-muted-foreground/85 block mt-0.5">
                                  {fmt(rev.reviewedAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {canApproveDocs && (
                      <form
                        action={async (formData) => {
                          "use server";
                          const approved = formData.get("approved") === "true";
                          const notes = formData.get("notes") as string;
                          await verifyDocument(
                            park.documents.land!.id,
                            approved,
                            notes,
                          );
                          redirect(`/motor-parks/${park.id}`);
                        }}
                        className="flex flex-col gap-2 mt-2 bg-background p-3 rounded border border-border">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          Verification Panel
                        </span>
                        <textarea
                          name="notes"
                          placeholder="Add comments or issues observed..."
                          rows={2}
                          className="w-full text-xs p-2 rounded border bg-secondary/10"
                          required
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="submit"
                            name="approved"
                            value="false"
                            className="text-[10px] bg-destructive hover:bg-destructive/90 text-white font-semibold py-1 px-2.5 rounded transition-colors">
                            Reject Document
                          </button>
                          <button
                            type="submit"
                            name="approved"
                            value="true"
                            className="text-[10px] bg-primary hover:bg-primary/95 text-white font-semibold py-1 px-2.5 rounded transition-colors">
                            Approve & Verify
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
              {park.documents.asin && (
                <div className="flex flex-col p-4 border border-border/50 rounded-lg bg-secondary/20 justify-between gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium">
                          Corporate ASIN
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {park.documents.asin.fileName}
                        </span>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0">
                      <a
                        href={park.documents.asin.fileUrl}
                        target="_blank"
                        rel="noreferrer">
                        <Download className="w-4 h-4 mr-2" /> View
                      </a>
                    </Button>
                  </div>

                  {/* Review / Verification Status */}
                  <div className="pt-3 border-t border-border/50 flex flex-col gap-2">
                    {park.documents.asin.verifiedAt ? (
                      <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-2.5 rounded border border-green-500/20 text-xs">
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span>✅ Reviewed & Verified</span>
                          <span>{fmt(park.documents.asin.verifiedAt)}</span>
                        </div>
                        {park.documents.asin.verificationNotes && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            <strong>Comment:</strong>{" "}
                            {park.documents.asin.verificationNotes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-500/5 text-amber-700 dark:text-amber-400 p-2.5 rounded border border-amber-500/10 text-xs flex items-center justify-between">
                        <span>⏳ Pending HOD Review</span>
                      </div>
                    )}

                    {park.documents.asin.reviews &&
                      park.documents.asin.reviews.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5 border-t border-border/30 pt-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Review Comments History
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {park.documents.asin.reviews.map((rev) => (
                              <div
                                key={rev.id}
                                className="p-2 rounded bg-secondary/30 border border-border/20 text-[11px]">
                                <div className="flex items-center justify-between font-semibold mb-0.5 text-[10px] text-muted-foreground">
                                  <span>
                                    {rev.reviewerName} (
                                    {rev.reviewerRole.replace(/_/g, " ")})
                                  </span>
                                  <span
                                    className={
                                      rev.isApproved
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-destructive"
                                    }>
                                    {rev.isApproved ? "Verified" : "Rejected"}
                                  </span>
                                </div>
                                {rev.notes && (
                                  <p className="text-foreground leading-relaxed">
                                    {rev.notes}
                                  </p>
                                )}
                                <span className="text-[9px] text-muted-foreground/85 block mt-0.5">
                                  {fmt(rev.reviewedAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {canApproveDocs && (
                      <form
                        action={async (formData) => {
                          "use server";
                          const approved = formData.get("approved") === "true";
                          const notes = formData.get("notes") as string;
                          await verifyDocument(
                            park.documents.asin!.id,
                            approved,
                            notes,
                          );
                          redirect(`/motor-parks/${park.id}`);
                        }}
                        className="flex flex-col gap-2 mt-2 bg-background p-3 rounded border border-border">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          Verification Panel
                        </span>
                        <textarea
                          name="notes"
                          placeholder="Add comments or issues observed..."
                          rows={2}
                          className="w-full text-xs p-2 rounded border bg-secondary/10"
                          required
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="submit"
                            name="approved"
                            value="false"
                            className="text-[10px] bg-destructive hover:bg-destructive/90 text-white font-semibold py-1 px-2.5 rounded transition-colors">
                            Reject Document
                          </button>
                          <button
                            type="submit"
                            name="approved"
                            value="true"
                            className="text-[10px] bg-primary hover:bg-primary/95 text-white font-semibold py-1 px-2.5 rounded transition-colors">
                            Approve & Verify
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facility Photos Grid */}
      {park.documents &&
        (park.documents.toilet ||
          park.documents.waitingArea ||
          park.documents.signage ||
          park.documents.waterFacility) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Facility Infrastructure Photos
              </CardTitle>
              <CardDescription>
                Evidence of compliance with Ministry site standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {park.documents.toilet && (
                  <div className="relative group border border-border/50 rounded-lg overflow-hidden bg-background">
                    <div className="aspect-[4/3] w-full bg-muted relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={park.documents.toilet.fileUrl}
                        alt="Toilet/Convenience"
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={park.documents.toilet.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                          title="Open in new tab">
                          <Eye className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    <div className="p-2 border-t border-border/50 flex justify-between items-center bg-secondary/10">
                      <span className="text-xs font-semibold truncate">
                        Toilet / Urinal
                      </span>
                      <a
                        href={park.documents.toilet.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                )}

                {park.documents.waitingArea && (
                  <div className="relative group border border-border/50 rounded-lg overflow-hidden bg-background">
                    <div className="aspect-4/3 w-full bg-muted relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={park.documents.waitingArea.fileUrl}
                        alt="Waiting Lounge"
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={park.documents.waitingArea.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                          title="Open in new tab">
                          <Eye className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    <div className="p-2 border-t border-border/50 flex justify-between items-center bg-secondary/10">
                      <span className="text-xs font-semibold truncate">
                        Waiting Area
                      </span>
                      <a
                        href={park.documents.waitingArea.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                )}

                {park.documents.signage && (
                  <div className="relative group border border-border/50 rounded-lg overflow-hidden bg-background">
                    <div className="aspect-[4/3] w-full bg-muted relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={park.documents.signage.fileUrl}
                        alt="Signage"
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={park.documents.signage.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                          title="Open in new tab">
                          <Eye className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    <div className="p-2 border-t border-border/50 flex justify-between items-center bg-secondary/10">
                      <span className="text-xs font-semibold truncate">
                        Signage
                      </span>
                      <a
                        href={park.documents.signage.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                )}

                {park.documents.waterFacility && (
                  <div className="relative group border border-border/50 rounded-lg overflow-hidden bg-background">
                    <div className="aspect-[4/3] w-full bg-muted relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={park.documents.waterFacility.fileUrl}
                        alt="Water Facility"
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={park.documents.waterFacility.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                          title="Open in new tab">
                          <Eye className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    <div className="p-2 border-t border-border/50 flex justify-between items-center bg-secondary/10">
                      <span className="text-xs font-semibold truncate">
                        Water Supply
                      </span>
                      <a
                        href={park.documents.waterFacility.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
