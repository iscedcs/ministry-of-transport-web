"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Loader2, Users, AlertTriangle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  scheduleRevalidationInspection,
  setRevalidationCertificateTerms,
  submitInspectionComment,
  hodOpsApproveRevalidation,
  hodApproveRevalidation,
  commissionerApproveRevalidation,
  psApproveRevalidation,
  psRejectRevalidation,
  rejectRevalidation,
} from "@/app/actions/revalidation-workflow";

const MIN_TEAM = 2;
const MAX_TEAM = 4;

export interface TeamMember {
  userId: string;
  isLead: boolean;
  comment: string | null;
  commentedAt: Date | string | null;
  name: string;
  role: string;
}

export interface EligibleInspector {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  stationLocation?: string | null;
}

const prettyRole = (r: string) =>
  r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function WorkflowActions({
  applicationId,
  status,
  role,
  currentUserId,
  inspectors,
  team,
  terms,
  psRejectionReason,
}: {
  applicationId: string;
  status: string;
  role: string;
  currentUserId: string;
  inspectors: EligibleInspector[];
  team: TeamMember[];
  terms?: {
    monthlyFeeAmount: number | null;
    previousMonthlyFeeAmount: number | null;
    effectiveFrom: Date | string | null;
    requiredFacilities: string | null;
  } | null;
  psRejectionReason?: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  // Team selection state — the HOD is added server-side and never listed here.
  const [selected, setSelected] = useState<string[]>([]);
  const [leadId, setLeadId] = useState<string>("");

  const isHodOps = role === "HOD_TRANSPORT_OPS" || role === "SYSTEM_ADMIN";
  const isHodReval = role === "HOD_PARKS_REVALIDATION" || role === "SYSTEM_ADMIN";
  const isComm = role === "COMMISSIONER" || role === "SYSTEM_ADMIN";
  const isPs = role === "PERMANENT_SECRETARY" || role === "SYSTEM_ADMIN";

  const me = team.find((m) => m.userId === currentUserId);
  const isLead = Boolean(me?.isLead);
  const isTeamMember = Boolean(me);

  // The HOD occupies one seat automatically, so the picker offers MAX - 1.
  const selectableLimit = MAX_TEAM - 1;

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (leadId === id) setLeadId("");
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= selectableLimit) {
        toast.error(
          `A team may hold at most ${MAX_TEAM} officers, and you are counted automatically.`,
        );
        return prev;
      }
      return [...prev, id];
    });
  }

  const handleSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;

    if (!date) return toast.error("Choose an inspection date");
    if (selected.length === 0) {
      return toast.error(
        `Select at least one other officer — an inspection needs a minimum of ${MIN_TEAM}.`,
      );
    }
    if (!leadId) return toast.error("Mark one officer as the lead inspector");

    startTransition(async () => {
      const res = await scheduleRevalidationInspection(
        applicationId,
        selected,
        leadId,
        date,
      );
      if (res.success) toast.success("Inspection scheduled — team notified");
      else toast.error(res.error ?? "Failed to schedule inspection");
    });
  };

  const handleComment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const comment = fd.get("comment") as string;
    if (!comment?.trim()) return toast.error("Enter your comment");

    startTransition(async () => {
      const res = await submitInspectionComment(applicationId, comment);
      if (res.success) toast.success("Comment recorded");
      else toast.error(res.error ?? "Failed to record comment");
    });
  };

  const handleHodOps = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rec = fd.get("recommendation") as string;
    if (!rec?.trim()) return toast.error("Enter your recommendation");

    startTransition(async () => {
      const res = await hodOpsApproveRevalidation(applicationId, rec);
      if (res.success) toast.success("Forwarded to HOD Parks Revalidation");
      else toast.error(res.error ?? "Failed to forward");
    });
  };

  const handleTerms = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await setRevalidationCertificateTerms(applicationId, {
        monthlyFeeNaira: fd.get("monthlyFeeNaira") as string,
        previousMonthlyFeeNaira: fd.get("previousMonthlyFeeNaira") as string,
        effectiveFrom: fd.get("effectiveFrom") as string,
        requiredFacilities: fd.get("requiredFacilities") as string,
      });
      if (res.success) toast.success("Certificate terms saved");
      else toast.error(res.error ?? "Failed to save terms");
    });
  };

  const handleSimple = (
    fn: (id: string) => Promise<{ success: boolean; error?: string }>,
    msg: string,
  ) => {
    startTransition(async () => {
      const res = await fn(applicationId);
      if (res.success) toast.success(msg);
      else toast.error(res.error ?? "Action failed");
    });
  };

  const handlePsReject = () => {
    const reason = prompt(
      "Why is this being returned to the HOD of Operations?",
    );
    if (reason === null) return;
    if (!reason.trim()) return toast.error("A reason is required");
    startTransition(async () => {
      const res = await psRejectRevalidation(applicationId, reason);
      if (res.success) toast.success("Returned to HOD of Operations");
      else toast.error(res.error ?? "Failed to return the application");
    });
  };

  const handleApproveType = (approvalType: "TEMPORAL" | "PERMANENT") => {
    const label = approvalType === "TEMPORAL" ? "temporal" : "permanent";
    if (
      !confirm(
        `Grant ${label.toUpperCase()} approval? This issues the certificate and cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await commissionerApproveRevalidation(
        applicationId,
        approvalType,
      );
      if (res.success) toast.success(`${label} approval granted`);
      else toast.error(res.error ?? "Failed to approve");
    });
  };

  const handleReject = () => {
    const reason = prompt(
      "Why is this being sent back? The reason is shown to whoever receives it.",
    );
    if (reason === null) return;
    if (!reason.trim()) return toast.error("A reason is required");
    startTransition(async () => {
      const res = await rejectRevalidation(applicationId, reason);
      // The application goes back a stage, not always to the applicant, so
      // say which.
      if (res.success) toast.success(`Sent back to ${res.data?.sentTo ?? "the previous stage"}`);
      else toast.error(res.error ?? "Failed to send back");
    });
  };

  if (status === "APPROVED" || status === "REJECTED" || status === "REVOKED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Completed</CardTitle>
          <CardDescription>
            No further actions can be taken on this application.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const awaitingScheduling = status === "SUBMITTED" || status === "UNDER_REVIEW";

  return (
    <div className="flex flex-col gap-4">
      {/* A returned application must explain itself before anything else. */}
      {psRejectionReason && awaitingScheduling && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Returned by the Permanent Secretary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{psRejectionReason}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Reschedule the inspection below, or reject the application so the
              applicant can reapply.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Stage 1: HOD Operations composes the team ─────────────────────── */}
      {awaitingScheduling && isHodOps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Schedule Inspection
            </CardTitle>
            <CardDescription>
              Pick {MIN_TEAM - 1}–{selectableLimit} officers to join you. You are
              added to every team automatically, and one member must lead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSchedule} className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Inspection team</label>
                  <span className="text-xs text-muted-foreground">
                    {selected.length + 1} of {MAX_TEAM} selected
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
                  <div className="flex items-center gap-3 p-3 bg-muted/40">
                    <div className="flex-1">
                      <p className="text-sm font-medium">You (HOD Operations)</p>
                      <p className="text-xs text-muted-foreground">
                        Always attends — cannot be removed
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeadId(currentUserId)}
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                        leadId === currentUserId
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-secondary",
                      )}>
                      <Star className="h-3 w-3" />
                      Lead
                    </button>
                  </div>

                  {inspectors
                    .filter((i) => i.id !== currentUserId)
                    .map((i) => {
                      const on = selected.includes(i.id);
                      return (
                        <div
                          key={i.id}
                          className={cn(
                            "flex items-center gap-3 p-3 transition-colors",
                            on && "bg-primary/5",
                          )}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(i.id)}
                            id={`insp-${i.id}`}
                            className="h-4 w-4 shrink-0"
                          />
                          <label
                            htmlFor={`insp-${i.id}`}
                            className="flex-1 cursor-pointer">
                            <p className="text-sm font-medium">
                              {i.firstName} {i.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {prettyRole(i.role)}
                              {i.stationLocation ? ` · ${i.stationLocation}` : ""}
                            </p>
                          </label>
                          {on && (
                            <button
                              type="button"
                              onClick={() => setLeadId(i.id)}
                              className={cn(
                                "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                                leadId === i.id
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:bg-secondary",
                              )}>
                              <Star className="h-3 w-3" />
                              Lead
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  The lead fills the checklist and uploads evidence. Everyone
                  else leaves a comment.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Inspection date
                </label>
                <Input type="date" name="date" required />
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Schedule inspection
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Stage 2a: the lead opens the checklist ────────────────────────── */}
      {status === "INSPECTION_SCHEDULED" && isLead && (
        <Card>
          <CardHeader>
            <CardTitle>Site Inspection — you are the lead</CardTitle>
            <CardDescription>
              Work through the checklist, attach site evidence, and file the
              report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/admin/revalidation-queue/${applicationId}/inspect`}>
                Open inspection checklist
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Stage 2b: everyone else on the team comments ──────────────────── */}
      {(status === "INSPECTION_SCHEDULED" || status === "INSPECTION_COMPLETED") &&
        isTeamMember &&
        !isLead && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your inspection comment</CardTitle>
              <CardDescription>
                The lead fills the checklist. Record what you observed on site —
                the HOD reads every comment before recommending.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleComment} className="space-y-3">
                <textarea
                  name="comment"
                  rows={4}
                  defaultValue={me?.comment ?? ""}
                  placeholder="What did you observe at this park?"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <Button type="submit" variant="outline" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {me?.comment ? "Update comment" : "Submit comment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

      {/* ── Stage 3: HOD Operations recommends ────────────────────────────── */}
      {status === "INSPECTION_COMPLETED" && isHodOps && (
        <Card>
          <CardHeader>
            <CardTitle>Your recommendation</CardTitle>
            <CardDescription>
              The lead has filed the checklist.{" "}
              {team.filter((m) => m.comment).length} of {team.length} team
              members have commented. Record your recommendation to forward this
              to HOD Parks Revalidation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleHodOps} className="space-y-3">
              <textarea
                name="recommendation"
                rows={4}
                placeholder="Your recommendation on this application…"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                required
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Recommend &amp; forward
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isPending}>
                  Reject
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Stage 4: HOD Parks Revalidation ───────────────────────────────── */}
      {status === "PENDING_HOD_APPROVAL" && isHodReval && (
        <Card>
          <CardHeader>
            <CardTitle>HOD Parks Revalidation</CardTitle>
            <CardDescription>
              Review the checklist, the team&apos;s comments and the HOD of
              Operations&apos; recommendation, then forward to the Permanent
              Secretary.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              onClick={() =>
                handleSimple(
                  hodApproveRevalidation,
                  "Forwarded to Permanent Secretary",
                )
              }
              disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve &amp; forward
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}>
              Reject
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Stage 5: Permanent Secretary ──────────────────────────────────── */}
      {status === "PENDING_PS_APPROVAL" && isPs && (
        <Card>
          <CardHeader>
            <CardTitle>Permanent Secretary</CardTitle>
            <CardDescription>
              Approve to forward to the Commissioner, or return it to the HOD of
              Operations with a reason.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              onClick={() =>
                handleSimple(
                  psApproveRevalidation,
                  "Signed and forwarded to Commissioner",
                )
              }
              disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve &amp; forward
            </Button>
            <Button
              variant="outline"
              onClick={handlePsReject}
              disabled={isPending}
              className="text-amber-600 hover:text-amber-600">
              Return to HOD of Operations
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}>
              Reject to applicant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Certificate terms — set before the Commissioner signs. */}
      {(isHodOps || isHodReval || isPs || isComm) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certificate Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              These appear on the revalidation letter. Set them before the
              Commissioner approves, or the letter prints with blanks.
            </p>
            <form onSubmit={handleTerms} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Monthly operational fee (₦)
                  </label>
                  <Input
                    name="monthlyFeeNaira"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={
                      terms?.monthlyFeeAmount != null
                        ? terms.monthlyFeeAmount / 100
                        : ""
                    }
                    placeholder="e.g. 15000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Previous fee (₦) — only if reviewed
                  </label>
                  <Input
                    name="previousMonthlyFeeNaira"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={
                      terms?.previousMonthlyFeeAmount != null
                        ? terms.previousMonthlyFeeAmount / 100
                        : ""
                    }
                    placeholder="Leave blank if unchanged"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">With effect from</label>
                  <Input
                    name="effectiveFrom"
                    type="date"
                    defaultValue={
                      terms?.effectiveFrom
                        ? new Date(terms.effectiveFrom)
                            .toISOString()
                            .slice(0, 10)
                        : ""
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Facilities required within 6 months
                  </label>
                  <Input
                    name="requiredFacilities"
                    defaultValue={terms?.requiredFacilities ?? ""}
                    placeholder="e.g. Fire extinguishers, CCTV"
                  />
                </div>
              </div>
              <Button type="submit" variant="outline" disabled={isPending}>
                {isPending ? "Saving..." : "Save terms"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Stage 6: Commissioner picks the approval type ─────────────────── */}
      {status === "PENDING_COMMISSIONER_APPROVAL" && isComm && (
        <Card>
          <CardHeader>
            <CardTitle>Commissioner — final approval</CardTitle>
            <CardDescription>
              Choose the kind of approval. The certificate is worded
              accordingly, and a temporal approval runs for six months rather
              than twelve.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleApproveType("PERMANENT")}
                disabled={isPending}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 text-left transition-colors hover:bg-emerald-500/10 disabled:opacity-50">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Permanent approval
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Full revalidation. Valid 12 months, numbered AN-REV.
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleApproveType("TEMPORAL")}
                disabled={isPending}
                className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-left transition-colors hover:bg-amber-500/10 disabled:opacity-50">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Temporal approval
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Permission to operate while matters are put right. Valid 6
                  months, numbered AN-TMP.
                </p>
              </button>
            </div>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}>
              Reject
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Waiting states for roles that cannot act right now. */}
      {awaitingScheduling && !isHodOps && (
        <Waiting text="Waiting for the HOD of Operations to schedule an inspection" />
      )}
      {status === "INSPECTION_SCHEDULED" && !isTeamMember && (
        <Waiting text="Waiting for the inspection team to file its report" />
      )}
      {status === "INSPECTION_COMPLETED" && !isHodOps && !isTeamMember && (
        <Waiting text="Waiting for the HOD of Operations' recommendation" />
      )}
      {status === "PENDING_HOD_APPROVAL" && !isHodReval && (
        <Waiting text="Waiting for HOD Parks Revalidation" />
      )}
      {status === "PENDING_PS_APPROVAL" && !isPs && (
        <Waiting text="Waiting for the Permanent Secretary" />
      )}
      {status === "PENDING_COMMISSIONER_APPROVAL" && !isComm && (
        <Waiting text="Waiting for the Commissioner's final approval" />
      )}
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-sm text-muted-foreground text-center">
        {text}
      </CardContent>
    </Card>
  );
}
