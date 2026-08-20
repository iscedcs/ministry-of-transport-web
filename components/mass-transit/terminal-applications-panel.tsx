"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, MapPin, FileText, ArrowRight, AlertTriangle } from "lucide-react";
import {
  addTerminalToCompany,
  hodApproveTerminal,
  psApproveTerminal,
  commissionerApproveTerminal,
  rejectTerminal,
  resubmitTerminal,
} from "@/app/actions/terminal-applications";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  canAdd,
}: {
  companyId: string;
  companyApproved: boolean;
  terminals: TerminalRow[];
  currentUserRole: string;
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

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submitNew = () =>
    startTransition(async () => {
      const res = await addTerminalToCompany(companyId, form);
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
              <Field
                label="Certificate document ID"
                value={form.businessPremisesCertDocId}
                onChange={(v) => set("businessPremisesCertDocId", v)}
                placeholder="Uploaded document reference"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Each site is certificated separately, so the business premises
              certificate for this terminal is required — the company&apos;s own
              certificate does not cover it.
            </p>

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
                        <p className="text-sm font-semibold">
                          Terminal {t.terminalNumber}
                          {t.addedAt && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              added after approval
                            </span>
                          )}
                        </p>
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
