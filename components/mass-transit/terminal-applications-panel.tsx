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
  Camera,
} from "lucide-react";
import {
  addTerminalToCompany,
  hodOpsRecommendTerminal,
  hodRevalApproveTerminal,
  psApproveTerminal,
  commissionerApproveTerminal,
  rejectTerminal,
  resubmitTerminal,
  scheduleAddedTerminalInspection,
  scheduleCompanyInspection,
  completeAddedTerminalInspection,
  commentOnTerminalInspection,
  getTerminalTeamCandidates,
} from "@/app/actions/terminal-applications";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FACILITY_ITEMS } from "@/lib/facilities";
import {
  buildTerminalChecklist,
  TERMINAL_SECTION_TITLES,
  type ChecklistItem,
  type Verified,
  type TerminalDeclarations,
} from "@/lib/terminal-checklist";
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
  /** Sections F and G, for the checklist to compare against. */
  maintainsManifest?: boolean | null;
  operatorsRegistered?: boolean | null;
  paymentsUpToDate?: boolean | null;
  safetySignages?: boolean | null;
  pendingSanctions?: boolean | null;
  sanctionDetails?: string | null;
  managementStaffCount?: number | null;
  adminStaffCount?: number | null;
  securityStaffCount?: number | null;
  otherStaffCount?: number | null;
  securityArrangement?: string | null;
  operationalStatus?: string | null;
  dailyVehiclesCount?: string | null;
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
    return ["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"].includes(role)
      ? {
          label: "Recommend to HOD Revalidation",
          // Never invoked directly - clicking this status opens the
          // recommendation form below instead, since a recommendation is
          // required. Kept here only so every stage has the same shape.
          run: (id: string) => hodOpsRecommendTerminal(id, ""),
        }
      : null;
  if (status === "PENDING_HOD_APPROVAL")
    return ["HOD_PARKS_REVALIDATION", "SYSTEM_ADMIN"].includes(role)
      ? {
          label: "Approve and send to PS",
          run: hodRevalApproveTerminal,
        }
      : null;
  if (status === "PENDING_PS_APPROVAL")
    return ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"].includes(role)
      ? { label: "Approve and send to Commissioner", run: psApproveTerminal }
      : null;
  if (status === "PENDING_COMMISSIONER_APPROVAL")
    return ["COMMISSIONER", "SYSTEM_ADMIN"].includes(role)
      ? { label: "Approve terminal", run: (id: string) => commissionerApproveTerminal(id, "PERMANENT") }
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
  companyAddress,
  companyStatus,
  revalidated,
  terminals,
  currentUserRole,
  currentUserId,
  canAdd,
}: {
  companyId: string;
  companyApproved: boolean;
  companyAddress: string | null;
  companyStatus: string;
  revalidated: boolean;
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
  /** Terminal whose HOD Ops recommendation form is open, if any. */
  const [recommending, setRecommending] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState("");

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
  const [evidence, setEvidence] = useState<{ url: string; caption?: string }[]>([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);

  const uploadEvidence = async (files: File[]) => {
    setEvidenceUploading(true);
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5MB.`);
          continue;
        }
        const fd = new globalThis.FormData();
        fd.append("file", file);
        fd.append("folder", "terminal-evidence");
        fd.append("linkedToType", "TERMINAL");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json?.url) {
          setEvidence((p) => [...p, { url: json.url, caption: file.name }]);
        } else {
          toast.error(json?.error ?? `Failed to upload ${file.name}`);
        }
      }
    } catch {
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setEvidenceUploading(false);
    }
  };
  /**
   * The checklist the inspector is filling. Keyed by the item's key so an
   * answer survives re-renders and the report ships the whole shape back.
   */
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  /** Build the full checklist from what this terminal actually declared. */
  const openReport = (t: TerminalRow) => {
    setReporting(t.id);
    setFindings("");
    setEvidence([]);
    const declared = declaredFacilities(t.facilitiesAvailable);
    const declarations: TerminalDeclarations = {
      maintainsManifest: t.maintainsManifest ?? null,
      operatorsRegistered: t.operatorsRegistered ?? null,
      paymentsUpToDate: t.paymentsUpToDate ?? null,
      safetySignages: t.safetySignages ?? null,
      pendingSanctions: t.pendingSanctions ?? null,
      sanctionDetails: t.sanctionDetails ?? null,
      managementStaffCount: t.managementStaffCount ?? null,
      adminStaffCount: t.adminStaffCount ?? null,
      securityStaffCount: t.securityStaffCount ?? null,
      otherStaffCount: t.otherStaffCount ?? null,
      securityArrangement: t.securityArrangement ?? null,
      operationalStatus: t.operationalStatus ?? null,
      dailyVehiclesCount: t.dailyVehiclesCount ?? null,
    };
    setChecklist(buildTerminalChecklist(declared, declarations));
  };

  const setVerdict = (key: string, verified: Verified) => {
    setChecklist((prev) =>
      prev.map((i) => (i.key === key ? { ...i, verified } : i)),
    );
  };

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
      const res =
        terminalId === "COMPANY"
          ? await scheduleCompanyInspection(companyId, {
              scheduledDate: visit.scheduledDate,
              memberIds: selected,
              leadId,
            })
          : await scheduleAddedTerminalInspection(terminalId, {
              ...visit,
              memberIds: selected,
              leadId,
            });
      if (res.success) {
        toast.success("Inspection scheduled.");
        setScheduling(null);
        router.refresh();
      } else {
        toast.error(("error" in res && res.error) || "Could not schedule the inspection.");
      }
    });

  const submitReport = (terminalId: string) =>
    startTransition(async () => {
      // The whole checklist is sent so the HOD reads declared vs found line
      // by line, exactly as on a revalidation inspection.
      const unanswered = checklist.filter((i) => i.verified === null).length;
      if (unanswered > 0) {
        toast.error(`${unanswered} checklist item(s) unanswered.`);
        return;
      }
      if (evidence.length === 0) {
        toast.error("Upload at least one piece of site evidence.");
        return;
      }

      const res = await completeAddedTerminalInspection(terminalId, {
        findings,
        checklist: checklist.length > 0 ? checklist : undefined,
        evidenceUrls: evidence,
      });
      if (res.success) {
        toast.success("Inspection report filed.");
        setReporting(null);
        setFindings("");
        setEvidence([]);
        setChecklist([]);
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

  const renderScheduleForm = (target: string, title: string) => (
                    <div className="mt-1 flex flex-col gap-3 rounded-xl border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {title}
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
                          Inspection team ({1 + selected.length} of {MAX_TEAM}{" "}
                          selected)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          You attend automatically as the HOD of Operations,
                          and you may lead the visit yourself or name one of
                          the others. Only the lead files the checklist; the
                          rest leave comments.
                        </p>

                        {/* The HOD (the signed-in officer) sits at the top as
                            a fixed row, mirroring the revalidation queue: the
                            slot is theirs and the Lead toggle is right there. */}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div
                            className={cn(
                              "flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-sm",
                              leadId === currentUserId
                                ? "border-primary bg-primary/5"
                                : "border-border bg-secondary/40",
                            )}>
                            <div>
                              <p className="font-medium">You (HOD Operations)</p>
                              <p className="text-xs text-muted-foreground">
                                Always attends - cannot be removed
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setLeadId(
                                  leadId === currentUserId ? "" : currentUserId,
                                )
                              }
                              className={cn(
                                "shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                                leadId === currentUserId
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:bg-secondary",
                              )}>
                              {leadId === currentUserId ? "★ Lead" : "Set as lead"}
                            </button>
                          </div>

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
                            {/* The HOD is always an option - the button above
                                is a shortcut, this the standard control. */}
                            <option value={currentUserId}>You (HOD Operations)</option>
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
                          onClick={() => submitSchedule(target)}
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
  );

  // A pack terminal is rejected by whoever holds the company's current stage.
  const packStageRole: Record<string, string> = {
    INSPECTION_COMPLETED: "HOD_TRANSPORT_OPS",
    PENDING_HOD_APPROVAL: "HOD_PARKS_REVALIDATION",
    PENDING_PS_APPROVAL: "PERMANENT_SECRETARY",
    PENDING_COMMISSIONER_APPROVAL: "COMMISSIONER",
  };
  const packRejectable = (t: TerminalRow) =>
    !t.addedAt &&
    !t.motorParkId &&
    t.applicationStatus !== "REJECTED" &&
    (currentUserRole === "SYSTEM_ADMIN" ||
      packStageRole[companyStatus] === currentUserRole) &&
    (t.applicationStatus === "INSPECTION_COMPLETED" ||
      t.applicationStatus === "INSPECTION_SCHEDULED");

  const packSchedulable = terminals.filter(
    (t) => !t.addedAt && !t.motorParkId && SCHEDULABLE.includes(t.applicationStatus),
  );

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

        {/* ── Company-level inspection for the whole pack ──────────────── */}
        {packSchedulable.length > 0 &&
          SCHEDULE_ROLES.includes(currentUserRole) && (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    Inspect the company ({packSchedulable.length} terminal
                    {packSchedulable.length === 1 ? "" : "s"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {companyAddress
                      ? `One visit at ${companyAddress}, covering every terminal declared on this application.`
                      : "This application has no company address. Add it under Edit Application to schedule for the company, or schedule each terminal below."}
                  </p>
                </div>
                {companyAddress ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => openSchedule("COMPANY")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Schedule for company
                  </button>
                ) : (
                  <Link
                    href={`/fleet-operators/${companyId}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                    Add company address
                  </Link>
                )}
              </div>
              {scheduling === "COMPANY" &&
                renderScheduleForm("COMPANY", "Schedule inspection for the company")}
            </div>
          )}

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
              // Pack terminals (declared on the first application) are approved with
              // the company, so they carry no per-terminal sign-off controls.
              const stage = t.addedAt
                ? stageFor(t.applicationStatus, currentUserRole)
                : null;
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
                    {isLive && (
                      <Link
                        href={`/motor-parks/${t.motorParkId}/park-certificate`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
                        <FileText className="h-3.5 w-3.5" />
                        {revalidated
                          ? "Park revalidation certificate"
                          : "Registration certificate"}
                      </Link>
                    )}

                    {/* Once an inspection has been filed, the reviewer needs
                        the checklist and findings before they can recommend
                        or return. Without this link the two buttons appeared
                        with no way to see what was found. */}
                    {[
                      "INSPECTION_COMPLETED",
                      "PENDING_HOD_APPROVAL",
                      "PENDING_PS_APPROVAL",
                      "PENDING_COMMISSIONER_APPROVAL",
                    ].includes(t.applicationStatus) && (
                      <Link
                        href={`/fleet-operators/${companyId}/terminals/${t.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
                        <FileText className="h-3.5 w-3.5" />
                        View report
                      </Link>
                    )}

                    {stage && t.applicationStatus === "PENDING_COMMISSIONER_APPROVAL" && (
                      <>
                        {(
                          [
                            ["PERMANENT", "Full approval", "bg-green-600 hover:bg-green-700"],
                            ["TEMPORAL", "Temporary approval", "bg-amber-600 hover:bg-amber-700"],
                          ] as const
                        ).map(([type, label, tone]) => (
                          <button
                            key={type}
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const res = await commissionerApproveTerminal(t.id, type);
                                if (res.success) {
                                  toast.success(`${label} granted.`);
                                  router.refresh();
                                } else {
                                  toast.error(res.error || "Action failed.");
                                }
                              })
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${tone}`}>
                            {label}
                          </button>
                        ))}
                      </>
                    )}

                    {stage && t.applicationStatus !== "PENDING_COMMISSIONER_APPROVAL" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          // The HOD Ops stage requires a written
                          // recommendation, so the button opens a form
                          // instead of firing directly. Every other stage
                          // is a straight sign-off.
                          if (t.applicationStatus === "INSPECTION_COMPLETED") {
                            setRecommending(
                              recommending === t.id ? null : t.id,
                            );
                            setRecommendation("");
                          } else {
                            act(stage.run, t.id);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
                        {stage.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {(stage || packRejectable(t)) && (
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
                          onClick={() => openReport(t)}
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

                  {scheduling === t.id && renderScheduleForm(t.id, "Schedule inspection")}

                  {/* ── HOD Ops writes their recommendation ─────────────── */}
                  {recommending === t.id && (
                    <div className="mt-1 flex flex-col gap-3 rounded-xl border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Your recommendation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        HOD Parks Revalidation reads this before deciding. Say
                        what you found and what you are recommending.
                      </p>
                      <textarea
                        rows={4}
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                        placeholder="e.g. Site meets the requirements. I recommend approval subject to installing two additional fire extinguishers within 30 days."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending || !recommendation.trim()}
                          onClick={() =>
                            startTransition(async () => {
                              const res = await hodOpsRecommendTerminal(
                                t.id,
                                recommendation,
                              );
                              if (res.success) {
                                toast.success(
                                  "Recommendation filed and forwarded to HOD Revalidation.",
                                );
                                setRecommending(null);
                                setRecommendation("");
                                router.refresh();
                              } else {
                                toast.error(res.error || "Could not forward.");
                              }
                            })
                          }
                          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                          {pending ? "Filing..." : "Forward to HOD Revalidation"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setRecommending(null);
                            setRecommendation("");
                          }}
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

                      <div className="flex flex-col gap-4">
                        <p className="text-xs text-muted-foreground">
                          Every item is answered. &quot;Not stated&quot; on a
                          declaration is a finding in itself — verify it, do not
                          skip it. Use N/A when an item does not apply.
                        </p>
                        {Object.entries(TERMINAL_SECTION_TITLES).map(
                          ([section, title]) => {
                            const items = checklist.filter(
                              (i) => i.section === section,
                            );
                            if (items.length === 0) return null;
                            return (
                              <div
                                key={section}
                                className="flex flex-col gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  {title}
                                </p>
                                {items.map((item) => (
                                  <div
                                    key={item.key}
                                    className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-sm">{item.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Declared: {item.declared}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 gap-1">
                                        {(
                                          ["YES", "PARTIAL", "NO", "N_A"] as const
                                        ).map((v) => (
                                          <button
                                            key={v}
                                            type="button"
                                            onClick={() =>
                                              setVerdict(item.key, v)
                                            }
                                            className={cn(
                                              "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                              item.verified === v
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:bg-secondary",
                                            )}>
                                            {v === "N_A" ? "N/A" : v}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          },
                        )}
                      </div>

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

                      <div className="flex flex-col gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Camera className="h-3.5 w-3.5" />
                          Site evidence (required)
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          disabled={evidenceUploading || pending}
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            e.target.value = "";
                            if (files.length > 0) uploadEvidence(files);
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Photographs or documents captured on site. Images or
                          PDF, under 5MB each.
                        </p>
                        {evidenceUploading && (
                          <p className="text-xs text-primary">Uploading...</p>
                        )}
                        {evidence.length > 0 && (
                          <ul className="flex flex-col gap-1">
                            {evidence.map((ev, i) => (
                              <li
                                key={ev.url}
                                className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs">
                                <span className="truncate">{ev.caption ?? "Evidence"}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEvidence((p) => p.filter((_, j) => j !== i))
                                  }
                                  className="ml-2 text-destructive">
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending || evidenceUploading}
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
