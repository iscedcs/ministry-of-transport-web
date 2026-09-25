/**
 * Terminal detail.
 *
 * A terminal added to an approved operator is its own small application, and
 * until now the only thing anyone could see of it was three lines on the
 * operator page — no certificate, no declared facilities, no photographs. The
 * officers deciding it need to read it, and the operator who submitted it
 * needs to see what they sent.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, FileText, CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { FACILITY_ITEMS } from "@/lib/facilities";
import {
  parseTerminalChecklist,
  TERMINAL_SECTION_TITLES,
} from "@/lib/terminal-checklist";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SITE_PHOTOS = [
  { key: "toiletPhotoId", label: "Toilet facilities" },
  { key: "waitingAreaPhotoId", label: "Passenger waiting area" },
  { key: "signagePhotoId", label: "Safety signage" },
  { key: "waterFacilityPhotoId", label: "Water facility / borehole" },
  { key: "cctvPhotoId", label: "Camera / CCTV installation" },
] as const;

function declared(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, boolean>;
}

export default async function TerminalDetailPage({
  params,
}: {
  params: Promise<{ id: string; terminalId: string }>;
}) {
  const { id, terminalId } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const terminal = await db.terminal.findUnique({
    where: { id: terminalId },
    include: {
      company: {
        select: { id: true, companyName: true, contactUserId: true },
      },
      motorPark: { select: { id: true, parkId: true, permitNumber: true } },
    },
  });

  // A missing record is a 404. A terminal that exists but hangs off another
  // operator is a wrong link, not a missing page, so it is sent to the right
  // operator rather than dead-ending.
  // The filed inspection for this terminal, if any. The HOD needs to see
  // the checklist and findings before recommending, and there was no place
  // on this page for either - so the button existed, the checklist did not.
  const inspection = await db.inspection.findFirst({
    where: {
      linkedEntityType: "TERMINAL",
      linkedEntityId: terminalId,
      status: { in: ["COMPLETED", "APPROVED", "REJECTED"] },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      status: true,
      scheduledDate: true,
      completedAt: true,
      overallAssessment: true,
      inspectionChecklist: true,
      evidenceUrls: true,
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  const checklist = inspection
    ? parseTerminalChecklist(inspection.inspectionChecklist)
    : [];
  const evidence = Array.isArray(inspection?.evidenceUrls)
    ? (inspection!.evidenceUrls as { url?: string; caption?: string }[])
    : [];

  if (!terminal) notFound();
  if (terminal.companyId !== id) {
    redirect(`/fleet-operators/${terminal.companyId}/terminals/${terminalId}`);
  }

  // An applicant sees only their own operator's terminals; Ministry staff see
  // any, since they are the ones deciding them.
  if (
    session.role === "EXTERNAL_APPLICANT" &&
    terminal.company.contactUserId !== session.userId
  ) {
    redirect("/unauthorized");
  }

  const facilities = declared(terminal.facilitiesAvailable);
  const claimed = FACILITY_ITEMS.filter((f) => facilities[f]);
  const notClaimed = FACILITY_ITEMS.filter((f) => !facilities[f]);

  const documentIds = [
    terminal.businessPremisesCertDocId,
    ...SITE_PHOTOS.map((p) => terminal[p.key]),
  ].filter(Boolean) as string[];

  const documents = documentIds.length
    ? await db.document.findMany({
        where: { id: { in: documentIds } },
        select: { id: true, fileName: true, fileUrl: true },
      })
    : [];
  const byId = new Map(documents.map((d) => [d.id, d]));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <Link
          href={`/fleet-operators/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {terminal.company.companyName}
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}>
              Terminal {terminal.terminalNumber}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {terminal.locationAddress}
            </p>
          </div>
          <StatusPill status={terminal.applicationStatus} />
        </div>
      </div>

      {terminal.rejectionReason && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong className="font-semibold">Returned:</strong>{" "}
          {terminal.rejectionReason}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Manager */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Terminal manager
            </h2>
            <Row label="Name" value={terminal.managerName} />
            <Row label="Phone" value={terminal.managerPhone} />
            <Row label="Email" value={terminal.managerEmail} />
            <Row label="Address" value={terminal.managerResidentialAddress} />
            {terminal.gpsCoordinates && (
              <Row label="GPS" value={terminal.gpsCoordinates} />
            )}
          </CardContent>
        </Card>

        {/* Certificate and progress */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Business premises certificate
            </h2>
            <Row
              label="Number"
              value={terminal.businessPremisesCertNo ?? "—"}
            />
            {terminal.businessPremisesCertDocId &&
            byId.get(terminal.businessPremisesCertDocId) ? (
              <a
                href={byId.get(terminal.businessPremisesCertDocId)!.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
                <FileText className="h-3.5 w-3.5" />
                {byId.get(terminal.businessPremisesCertDocId)!.fileName}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                No certificate attached.
              </p>
            )}

            <div className="mt-2 border-t pt-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Progress
              </h2>
              <div className="mt-2 flex flex-col gap-1.5 text-sm">
                <Stage label="Added" at={terminal.addedAt} />
                <Stage label="HOD recommendation" at={terminal.hodApprovedAt} />
                <Stage label="Permanent Secretary" at={terminal.psApprovedAt} />
                <Stage
                  label="Commissioner"
                  at={terminal.commissionerApprovedAt}
                />
              </div>
              {terminal.motorPark && (
                <Link
                  href={`/motor-parks/${terminal.motorPark.id}/approval-letter`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
                  <FileText className="h-3.5 w-3.5" />
                  Letter of authority ({terminal.motorPark.parkId})
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facilities as declared */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Facilities declared
          </h2>
          {claimed.length === 0 && notClaimed.length === FACILITY_ITEMS.length ? (
            <p className="text-sm text-muted-foreground">
              Nothing was declared for this terminal.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {FACILITY_ITEMS.map((facility) => (
                <div
                  key={facility}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  {facilities[facility] ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <span
                    className={
                      facilities[facility]
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }>
                    {facility}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Site photographs */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Site photographs
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {SITE_PHOTOS.map((photo) => {
              const doc = terminal[photo.key]
                ? byId.get(terminal[photo.key] as string)
                : null;
              return (
                <div key={photo.key} className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {photo.label}
                  </span>
                  {doc ? (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.fileUrl}
                        alt={photo.label}
                        className="h-32 w-full object-cover"
                      />
                    </a>
                  ) : (
                    <span className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                      Not provided
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Inspection report — declared vs found, item by item */}
      {inspection && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Inspection report
              </h2>
              <span className="text-xs text-muted-foreground">
                Lead: {inspection.assignedTo.firstName}{" "}
                {inspection.assignedTo.lastName}
                {inspection.completedAt
                  ? ` · Filed ${inspection.completedAt.toDateString()}`
                  : ""}
              </span>
            </div>

            {inspection.overallAssessment && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Findings
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {inspection.overallAssessment}
                </p>
              </div>
            )}

            {checklist.length > 0 && (
              <div className="flex flex-col gap-3">
                {Object.entries(TERMINAL_SECTION_TITLES).map(
                  ([section, title]) => {
                    const items = checklist.filter((i) => i.section === section);
                    if (items.length === 0) return null;
                    return (
                      <div key={section} className="flex flex-col gap-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {title}
                        </p>
                        {items.map((item) => (
                          <div
                            key={item.key}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm">{item.label}</p>
                              <p className="text-xs text-muted-foreground">
                                Declared: {item.declared}
                              </p>
                            </div>
                            <VerdictBadge verified={item.verified} />
                          </div>
                        ))}
                      </div>
                    );
                  },
                )}
              </div>
            )}

            {evidence.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Evidence
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {evidence.map((e, i) =>
                    e.url ? (
                      <a
                        key={i}
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={e.url}
                          alt={e.caption ?? `Evidence ${i + 1}`}
                          className="h-32 w-full object-cover"
                        />
                        {e.caption && (
                          <p className="px-2 py-1 text-[11px] text-muted-foreground">
                            {e.caption}
                          </p>
                        )}
                      </a>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VerdictBadge({ verified }: { verified: string | null }) {
  const tone: Record<string, string> = {
    YES: "bg-green-500/10 text-green-700 dark:text-green-400",
    PARTIAL: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    NO: "bg-destructive/10 text-destructive",
    N_A: "bg-muted text-muted-foreground",
  };
  const label = verified === "N_A" ? "N/A" : verified ?? "—";
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider",
        tone[verified ?? ""] ?? "bg-muted text-muted-foreground",
      )}>
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:items-baseline">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function Stage({ label, at }: { label: string; at: Date | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={at ? "font-medium text-foreground" : "text-muted-foreground"}>
        {at ? at.toDateString() : "Pending"}
      </span>
    </div>
  );
}
