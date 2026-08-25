"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  MapPin,
  FileText,
  ArrowRight,
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
} from "lucide-react";
import {
  addTerminalToCompany,
  hodApproveTerminal,
  psApproveTerminal,
  commissionerApproveTerminal,
  rejectTerminal,
  resubmitTerminal,
  scheduleAddedTerminalInspection,
  completeAddedTerminalInspection,
  commentOnTerminalInspection,
  getTerminalTeamCandidates,
} from "@/app/actions/terminal-applications";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FACILITY_ITEMS } from "@/lib/facilities";
import { uploadCacDocument } from "@/app/actions/upload";

/** The site evidence a park is asked for, so a terminal is asked the same. */
const SITE_PHOTOS = [
  { key: "toilet", label: "Toilet facilities" },
  { key: "waitingArea", label: "Passenger waiting area" },
  { key: "signage", label: "Safety signage" },
  { key: "waterFacility", label: "Water facility / borehole" },
  { key: "cctv", label: "Camera / CCTV installation" },
] as const;

export interface TerminalRow {
  id: string;
  terminalNumber: number;
  locationAddress: string;
  managerName: string;
  managerPhone: string;
  businessPremisesCertNo: string | null;
  applicationStatus: string;
  rejectionReason: string | null;
  motorParkId: string | null;
  /** Added after the company was approved, so it has its own chain. */
  addedAt: Date | null;
  /**
   * What the operator declared this site has, for the inspector to verify.
   * Typed loosely because it arrives as a Prisma JSON value.
   */
  facilitiesAvailable?: unknown;
  inspectionDueAt?: Date | null;
  /** Who is attending, and which of them leads. */
  inspectionTeam?: {
    userId: string;
    isLead: boolean;
    comment: string | null;
    name: string;
  }[];
}

/** Which control the signed-in officer gets, given where the terminal is. */
function stageFor(status: string, role: string) {
  if (status === "INSPECTION_COMPLETED")
    return ["HOD_TRANSPORT_OPS", "HOD_PARKS", "SYSTEM_ADMIN"].includes(role)
      ? { label: "Recommend to PS", run: hodApproveTerminal }
      : null;
  if (status === "PENDING_PS_APPROVAL")
    return ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"].includes(role)
      ? { label: "Approve and send to Commissioner", run: psApproveTerminal }
      : null;
  if (status === "PENDING_COMMISSIONER_APPROVAL")
    return ["COMMISSIONER", "SYSTEM_ADMIN"].includes(role)
      ? { label: "Approve terminal", run: commissionerApproveTerminal }
      : null;
  return null;
}

/** Scheduling the visit is the HOD of Operations' job, as everywhere else. */
const SCHEDULE_ROLES = ["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"];

/** Whoever attends files the report. */
const REPORT_ROLES = [
  "FIELD_INSPECTOR",
  "VEHICLE_INSPECTION_OFFICER",
  "HOD_TRANSPORT_OPS",
  "SYSTEM_ADMIN",
];

const SCHEDULABLE = ["SUBMITTED", "REJECTED", "UNDER_REVIEW"];

/**
 * The HOD occupies one seat automatically, so the picker offers MAX - 1.
 * Same numbers as a revalidation inspection, on purpose: an officer should
 * learn one process, not two.
 */
const MAX_TEAM = 4;
const SELECTABLE_LIMIT = MAX_TEAM - 1;

/** The facilities the operator actually claimed, out of the JSON column. */
function declaredFacilities(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, claimed]) => claimed === true)
    .map(([facility]) => facility);
}

const TONE: Record<string, string> = {
  APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400",
  TEMPORAL_APPROVAL: "bg-green-500/10 text-green-700 dark:text-green-400",
  REJECTED: "bg-destructive/10 text-destructive",
  INSPECTION_SCHEDULED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export function TerminalApplicationsPanel({
  companyId,
  companyApproved,
  terminals,
  currentUserRole,
  currentUserId,
  canAdd,
}: {
  companyId: string;
  companyApproved: boolean;
  terminals: TerminalRow[];
  currentUserRole: string;
  currentUserId: string;
  canAdd: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    locationAddress: "",
    gpsCoordinates: "",
    managerName: "",
    managerPhone: "",
    managerEmail: "",
    managerResidentialAddress: "",
    businessPremisesCertNo: "",
    businessPremisesCertDocId: "",
  });
  const [certFileName, setCertFileName] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [photoNames, setPhotoNames] = useState<Record<string, string>>({});

  /** Which terminal has its scheduling or reporting form open. */
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [inspectors, setInspectors] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([]);
  const [visit, setVisit] = useState({ scheduledDate: "", station: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [leadId, setLeadId] = useState("");
  const [comment, setComment] = useState("");
  const [commenting, setCommenting] = useState<string | null>(null);

  function toggleMember(userId: string) {
    setSelected((prev) => {
      if (prev.includes(userId)) {
        if (leadId === userId) setLeadId("");
        return prev.filter((x) => x !== userId);
      }
      if (prev.length >= SELECTABLE_LIMIT) return prev;
      return [...prev, userId];
    });
  }
  const [findings, setFindings] = useState("");
  const [verified, setVerified] = useState<Record<string, string>>({});

  // Inspectors are only needed once a scheduling form is opened, so the list
  // is fetched then rather than on every render of the page.
  const openSchedule = (terminalId: string) => {
    setScheduling(terminalId);
    setVisit({ scheduledDate: "", station: "" });
    setSelected([]);
    setLeadId("");
    if (inspectors.length === 0) {
      getTerminalTeamCandidates().then((res) => {
        if (res.success) setInspectors(res.data ?? []);
      });
    }
  };

  const submitSchedule = (terminalId: string) =>
    startTransition(async () => {
      const res = await scheduleAddedTerminalInspection(terminalId, {
        ...visit,
        memberIds: selected,
        leadId,
      });
      if (res.success) {
        toast.success("Inspection scheduled.");
        setScheduling(null);
        router.refresh();
      } else {
        toast.error(res.error || "Could not schedule the inspection.");
      }
    });

  const submitReport = (terminalId: string) =>
    startTransition(async () => {
      // The declared facilities are sent back item by item, so the HOD sees
      // what was claimed against what was found rather than prose alone.
      const checklist = Object.entries(verified).map(([label, result]) => ({
        label,
        declared: true,
        verified: result,
      }));

      const res = await completeAddedTerminalInspection(terminalId, {
        findings,
        checklist: checklist.length > 0 ? checklist : undefined,
      });
      if (res.success) {
        toast.success("Inspection report filed.");
        setReporting(null);
        setFindings("");
        setVerified({});
        router.refresh();
      } else {
        toast.error(res.error || "Could not file the report.");
      }
    });

  /**
   * One upload path for every document on this form. The panel previously
   * asked for a "document reference", which an operator had no way to obtain
   * - the field was required and unfillable.
   */
  async function upload(
    file: File,
    onDone: (documentId: string) => void,
    key: string,
  ) {
    setUploading(key);
    const fd = new globalThis.FormData();
    fd.append("file", file);
    const res = await uploadCacDocument(fd);
    if (res.success) onDone(res.documentId);
    else toast.error(res.error || "Upload failed.");
    setUploading(null);
  }

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submitNew = () =>
    startTransition(async () => {
      const res = await addTerminalToCompany(companyId, {
        ...form,
        facilitiesAvailable: facilities,
        toiletPhotoId: photos.toilet,
        waitingAreaPhotoId: photos.waitingArea,
        signagePhotoId: photos.signage,
        waterFacilityPhotoId: photos.waterFacility,
        cctvPhotoId: photos.cctv,
      });
      if (res.success) {
        toast.success("Terminal submitted for approval.");
        setAdding(false);
        router.refresh();
      } else {
        toast.error(res.error || "Could not add the terminal.");
      }
    });

  const act = (fn: (id: string) => Promise<{ success: boolean; error?: string }>, id: string) =>
    startTransition(async () => {
      const res = await fn(id);
      if (res.success) {
        toast.success("Done.");
        router.refresh();
      } else {
        toast.error(res.error || "Action failed.");
      }
    });

  const reject = (id: string) =>
    startTransition(async () => {
      const reason = window.prompt("Why is this terminal being returned?");
      if (!reason) return;
      const res = await rejectTerminal(id, reason);
      if (res.success) {
        toast.success("Terminal returned to the operator.");
        router.refresh();
      } else {
        toast.error(res.error || "Could not return the terminal.");
      }
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Terminals</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {companyApproved
                ? "An approved operator can open further terminals. Each one is inspected and approved on its own before it becomes a park."
                : "Terminals declared on this application become parks when the company is approved."}
            </p>
          </div>

          {canAdd && companyApproved && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add terminal
            </button>
          )}
        </div>

        {/* ── New terminal ─────────────────────────────────────────────── */}
        {adding && (
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Terminal address"
                value={form.locationAddress}
                onChange={(v) => set("locationAddress", v)}
                className="sm:col-span-2"
              />
              <Field
                label="GPS coordinates (optional)"
                value={form.gpsCoordinates}
                onChange={(v) => set("gpsCoordinates", v)}
                placeholder="6.2088, 7.0676"
              />
              <Field
                label="Manager name"
                value={form.managerName}
                onChange={(v) => set("managerName", v)}
              />
              <Field
                label="Manager phone"
                value={form.managerPhone}
                onChange={(v) => set("managerPhone", v)}
              />
              <Field
                label="Manager email"
                value={form.managerEmail}
                onChange={(v) => set("managerEmail", v)}
              />
              <Field
                label="Manager residential address"
                value={form.managerResidentialAddress}
                onChange={(v) => set("managerResidentialAddress", v)}
                className="sm:col-span-2"
              />
              <Field
                label="Business premises certificate number"
                value={form.businessPremisesCertNo}
                onChange={(v) => set("businessPremisesCertNo", v)}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Business premises certificate (upload)
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={uploading === "cert"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCertFileName(file.name);
                    upload(
                      file,
                      (id) => set("businessPremisesCertDocId", id),
                      "cert",
                    );
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
                />
                {uploading === "cert" && (
                  <span className="text-xs text-muted-foreground">
                    Uploading...
                  </span>
                )}
                {form.businessPremisesCertDocId && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Attached: {certFileName}
                  </span>
                )}
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              Each site is certificated separately, so the business premises
              certificate for this terminal is required — the company&apos;s own
              certificate does not cover it.
            </p>

            {/* The terminal is inspected and becomes a park, so it is asked
                for the same facility evidence a park is asked for. */}
            <div className="flex flex-col gap-2 border-t pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Facilities at this terminal
              </p>
              <p className="text-xs text-muted-foreground">
                Tick what the site has and leave out what it does not. Nothing
                here is required - the inspection settles what is there.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {FACILITY_ITEMS.map((facility) => (
                  <label
                    key={facility}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary/50">
                    <input
                      type="checkbox"
                      checked={!!facilities[facility]}
                      onChange={(e) =>
                        setFacilities((prev) => ({
                          ...prev,
                          [facility]: e.target.checked,
                        }))
                      }
                    />
                    <span>{facility}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Site photographs (optional)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SITE_PHOTOS.map((photo) => (
                  <label key={photo.key} className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {photo.label}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading === photo.key}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPhotoNames((prev) => ({
                          ...prev,
                          [photo.key]: file.name,
                        }));
                        upload(
                          file,
                          (id) =>
                            setPhotos((prev) => ({ ...prev, [photo.key]: id })),
                          photo.key,
                        );
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
                    />
                    {uploading === photo.key && (
                      <span className="text-xs text-muted-foreground">
                        Uploading...
                      </span>
                    )}
                    {photos[photo.key] && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {photoNames[photo.key]}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={submitNew}
                className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {pending ? "Submitting…" : "Submit for approval"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setAdding(false)}
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── The terminals themselves ─────────────────────────────────── */}
        {terminals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No terminal has been recorded for this operator.
          </p>
        ) : (
          <div className="divide-y rounded-xl border">
            {terminals.map((t) => {
              const stage = stageFor(t.applicationStatus, currentUserRole);
              const isLive = !!t.motorParkId;

              return (
                <div key={t.id} className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <Link
                          href={`/fleet-operators/${companyId}/terminals/${t.id}`}
                          className="text-sm font-semibold transition-colors hover:text-primary hover:underline">
                          Terminal {t.terminalNumber}
                        </Link>
                        {t.addedAt && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            added after approval
                          </span>
                        )}
                        <p className="truncate text-xs text-muted-foreground">
                          {t.locationAddress}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.managerName} · {t.managerPhone}
                          {t.businessPremisesCertNo
                            ? ` · Premises cert ${t.businessPremisesCertNo}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold",
                        TONE[t.applicationStatus] ?? "bg-secondary text-muted-foreground",
                      )}>
                      {t.applicationStatus.replace(/_/g, " ")}
                    </span>
                  </div>

                  {t.rejectionReason && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {t.rejectionReason}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {isLive && (
                      <Link
                        href={`/motor-parks/${t.motorParkId}/approval-letter`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
                        <FileText className="h-3.5 w-3.5" />
                        Letter of authority
                      </Link>
                    )}

                    {stage && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => act(stage.run, t.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
                        {stage.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {stage && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => reject(t.id)}
                        className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50">
                        Return with reason
                      </button>
                    )}

                    {/* A site nobody has visited cannot be recommended, so
                        scheduling is the only move available here. */}
                    {!isLive &&
                      SCHEDULABLE.includes(t.applicationStatus) &&
                      SCHEDULE_ROLES.includes(currentUserRole) && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => openSchedule(t.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Schedule inspection
                        </button>
                      )}

                    {t.applicationStatus === "INSPECTION_SCHEDULED" &&
                      (t.inspectionTeam?.some(
                        (m) => m.userId === currentUserId && m.isLead,
                      ) ||
                        currentUserRole === "SYSTEM_ADMIN") && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setReporting(t.id);
                            setFindings("");
                            setVerified({});
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          File inspection report
                        </button>
                      )}

                    {t.applicationStatus === "INSPECTION_SCHEDULED" &&
                      (t.inspectionTeam?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCommenting(commenting === t.id ? null : t.id)
                          }
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
                          Team ({t.inspectionTeam?.length})
                        </button>
                      )}

                    {t.applicationStatus === "INSPECTION_SCHEDULED" &&
                      t.inspectionDueAt && (
                        <span className="text-xs text-muted-foreground">
                          Report due {new Date(t.inspectionDueAt).toDateString()}
                        </span>
                      )}
                  </div>

                  {/* ── Schedule the visit ──────────────────────────────── */}
                  {scheduling === t.id && (
                    <div className="mt-1 flex flex-col gap-3 rounded-xl border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Schedule inspection
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            Date of visit
                          </span>
                          <input
                            type="date"
                            value={visit.scheduledDate}
                            onChange={(e) =>
                              setVisit((v) => ({
                                ...v,
                                scheduledDate: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            Station (optional)
                          </span>
                          <input
                            value={visit.station}
                            onChange={(e) =>
                              setVisit((v) => ({ ...v, station: e.target.value }))
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                        </label>
                      </div>

                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Inspection team ({selected.length} of{" "}
                          {SELECTABLE_LIMIT} selected)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          You attend automatically and are not listed. Pick up
                          to {SELECTABLE_LIMIT} officers, then name the lead -
                          only the lead files the checklist, the rest comment.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {inspectors.map((i) => {
                            const picked = selected.includes(i.id);
                            const full = !picked && selected.length >= SELECTABLE_LIMIT;
                            return (
                              <label
                                key={i.id}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                                  picked
                                    ? "border-primary bg-primary/5"
                                    : "border-border",
                                  full
                                    ? "cursor-not-allowed opacity-40"
                                    : "cursor-pointer hover:bg-secondary/50",
                                )}>
                                <input
                                  type="checkbox"
                                  checked={picked}
                                  disabled={full}
                                  onChange={() => toggleMember(i.id)}
                                />
                                <span>
                                  {i.firstName} {i.lastName}
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        <label className="mt-1 flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            Lead inspector
                          </span>
                          <select
                            value={leadId}
                            onChange={(e) => setLeadId(e.target.value)}
                            className="h-[38px] w-full rounded-lg border border-border bg-background px-3 text-sm">
                            <option value="">Select the lead</option>
                            {inspectors
                              .filter((i) => selected.includes(i.id))
                              .map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.firstName} {i.lastName}
                                </option>
                              ))}
                          </select>
                        </label>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        The report is due five working days after the visit.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => submitSchedule(t.id)}
                          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                          {pending ? "Scheduling..." : "Schedule"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setScheduling(null)}
                          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium disabled:opacity-50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Who is attending, and what they saw ─────────────── */}
                  {commenting === t.id && (
                    <div className="mt-1 flex flex-col gap-3 rounded-xl border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Inspection team
                      </p>
                      <div className="flex flex-col gap-2">
                        {t.inspectionTeam?.map((m) => (
                          <div
                            key={m.userId}
                            className="rounded-lg border border-border px-3 py-2">
                            <p className="text-sm font-medium">
                              {m.name}
                              {m.isLead && (
                                <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                                  Lead
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {m.comment ??
                                (m.isLead
                                  ? "Files the checklist and findings."
                                  : "No comment yet.")}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* A member who is not the lead records what they saw. */}
                      {t.inspectionTeam?.some(
                        (m) => m.userId === currentUserId && !m.isLead,
                      ) && (
                        <div className="flex flex-col gap-2 border-t pt-3">
                          <textarea
                            rows={2}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="What did you observe on site?"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const res = await commentOnTerminalInspection(
                                  t.id,
                                  comment,
                                );
                                if (res.success) {
                                  toast.success("Comment recorded.");
                                  setComment("");
                                  router.refresh();
                                } else {
                                  toast.error(res.error || "Could not save.");
                                }
                              })
                            }
                            className="w-fit rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                            Save comment
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── File the report ─────────────────────────────────── */}
                  {reporting === t.id && (
                    <div className="mt-1 flex flex-col gap-3 rounded-xl border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Inspection report
                      </p>

                      {declaredFacilities(t.facilitiesAvailable).length > 0 && (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-muted-foreground">
                              The operator declared these. Record what you found
                              — the HOD weighs the difference, not the prose.
                            </p>
                            {declaredFacilities(t.facilitiesAvailable).map(
                              (facility) => (
                                <div
                                  key={facility}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                                  <span className="text-sm">{facility}</span>
                                  <div className="flex gap-1">
                                    {["YES", "PARTIAL", "NO", "N/A"].map((v) => (
                                      <button
                                        key={v}
                                        type="button"
                                        onClick={() =>
                                          setVerified((prev) => ({
                                            ...prev,
                                            [facility]: v,
                                          }))
                                        }
                                        className={cn(
                                          "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                          verified[facility] === v
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border hover:bg-secondary",
                                        )}>
                                        {v}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}

                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Findings
                        </span>
                        <textarea
                          rows={3}
                          value={findings}
                          onChange={(e) => setFindings(e.target.value)}
                          placeholder="What was found at the site."
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => submitReport(t.id)}
                          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                          {pending ? "Filing..." : "File report"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setReporting(null)}
                          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium disabled:opacity-50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="hidden">

                    {t.applicationStatus === "REJECTED" && canAdd && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => act(resubmitTerminal, t.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50">
                        Resubmit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}
