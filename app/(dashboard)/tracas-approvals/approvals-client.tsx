"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileText,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Clock,
  Printer,
  Bus,
  UserCheck,
  QrCode,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  mdApproveLetter,
  mdDeclineLetter,
  commissionerApproveLetter,
  commissionerDeclineLetter,
  resubmitLetterForApproval,
  type ApprovalQueueData,
  type ApprovalQueueVehicle,
  type TracasOverview,
} from "@/app/actions/tracas-approvals";

export function ApprovalsClient({
  data,
  overview,
  role,
}: {
  data: ApprovalQueueData;
  overview: TracasOverview | null;
  role: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [declineTarget, setDeclineTarget] =
    useState<ApprovalQueueVehicle | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const { stage, pending, counts, recentlyDeclined } = data;

  const stageLabel =
    stage === "MD"
      ? "Awaiting your approval as Ag. MD/CEO"
      : stage === "COMMISSIONER"
        ? "Awaiting your approval as Commissioner"
        : "Letters in the approval chain (view only)";

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        toast.success("Letter updated.");
        setDeclineTarget(null);
        setDeclineReason("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Action failed.");
      }
    });
  };

  const handleApprove = (v: ApprovalQueueVehicle) =>
    run(() =>
      stage === "MD"
        ? mdApproveLetter(v.id)
        : commissionerApproveLetter(v.id),
    );

  const handleDeclineConfirm = () => {
    if (!declineTarget) return;
    if (!declineReason.trim()) {
      toast.error("Please give a reason for declining.");
      return;
    }
    const id = declineTarget.id;
    const reason = declineReason.trim();
    run(() =>
      stage === "MD"
        ? mdDeclineLetter(id, reason)
        : commissionerDeclineLetter(id, reason),
    );
  };

  return (
    <div className="space-y-8 py-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            TRACAS Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{stageLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tracas"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-secondary text-foreground font-semibold rounded-lg hover:bg-secondary/70 transition-colors">
            <Bus className="w-3.5 h-3.5" />
            Open fleet register
          </Link>
        </div>
      </div>

      {/* Chain overview — the MD sees the whole picture, not just her step */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Awaiting MD"
          value={counts.pendingMd}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          tint="bg-amber-500/10"
          highlight={stage === "MD"}
        />
        <StatCard
          label="Awaiting Commissioner"
          value={counts.pendingCommissioner}
          icon={<ShieldCheck className="w-5 h-5 text-blue-500" />}
          tint="bg-blue-500/10"
          highlight={stage === "COMMISSIONER"}
        />
        <StatCard
          label="Approved / printable"
          value={counts.approved}
          icon={<Printer className="w-5 h-5 text-emerald-500" />}
          tint="bg-emerald-500/10"
        />
        <StatCard
          label="Declined"
          value={counts.declined}
          icon={<XCircle className="w-5 h-5 text-red-500" />}
          tint="bg-red-500/10"
        />
      </div>

      {/* Fleet-wide overview — her remit is the whole company, not just the
          letters sitting on her desk. */}
      {overview && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Fleet
                  </p>
                  <Bus className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mt-1">
                  {overview.fleet.total}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {overview.fleet.active} active
                </p>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <Row label="State fleet" value={overview.fleet.government} />
                  <Row label="Private owner" value={overview.fleet.individual} />
                  <Row label="Franchise" value={overview.fleet.collaborative} />
                  <Row
                    label="New joiners"
                    value={overview.fleet.newJoiners}
                    accent="text-amber-500"
                  />
                </dl>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Drivers
                  </p>
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mt-1">
                  {overview.drivers.total}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {overview.drivers.active} active
                </p>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <Row label="Assigned" value={overview.drivers.assigned} />
                  <Row
                    label="Unassigned"
                    value={overview.drivers.unassigned}
                    accent={
                      overview.drivers.unassigned > 0
                        ? "text-amber-500"
                        : undefined
                    }
                  />
                </dl>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    QR Stickers
                  </p>
                  <QrCode className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mt-1">
                  {overview.stickers.total}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  in inventory
                </p>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <Row
                    label="Bound to vehicles"
                    value={overview.stickers.assigned}
                  />
                  <Row
                    label="Available"
                    value={overview.stickers.available}
                    accent={
                      overview.stickers.available === 0
                        ? "text-red-500"
                        : undefined
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Gaps worth chasing, surfaced rather than buried in the register */}
          {(overview.fleet.withoutDriver > 0 ||
            overview.fleet.withoutSticker > 0) && (
            <div className="flex flex-wrap gap-3">
              {overview.fleet.withoutDriver > 0 && (
                <Link
                  href="/tracas"
                  className="flex-1 min-w-[220px] rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 hover:bg-amber-500/15 transition-colors">
                  <p className="text-sm font-bold text-amber-500">
                    {overview.fleet.withoutDriver} vehicle
                    {overview.fleet.withoutDriver === 1 ? "" : "s"} without a
                    driver
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    A Letter of Authority names its driver — assign before
                    approving.
                  </p>
                </Link>
              )}
              {overview.fleet.withoutSticker > 0 && (
                <Link
                  href="/tracas"
                  className="flex-1 min-w-[220px] rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 hover:bg-blue-500/15 transition-colors">
                  <p className="text-sm font-bold text-blue-500">
                    {overview.fleet.withoutSticker} vehicle
                    {overview.fleet.withoutSticker === 1 ? "" : "s"} without a
                    sticker
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Unstickered vehicles cannot be verified by public scan.
                  </p>
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {/* Action queue */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/60">
            <h2 className="font-semibold text-foreground">
              {stage ? "Your queue" : "In the chain"} ({pending.length})
            </h2>
          </div>

          {pending.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Nothing awaiting approval. All caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {pending.map((v) => (
                <li
                  key={v.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">
                        {v.registrationNumber}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {v.fleetNumber}
                      </Badge>
                      <Badge
                        className={
                          v.enrollmentType === "NEW_JOINER"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px] font-bold"
                        }>
                        {v.enrollmentType === "NEW_JOINER"
                          ? "New Joiner"
                          : "Existing"}
                      </Badge>
                      {v.letterStatus === "PENDING_COMMISSIONER_APPROVAL" && (
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-bold">
                          MD signed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {v.makeModel ?? "—"} · {v.category} ·{" "}
                      {v.assignedDriver
                        ? `${v.assignedDriver.fullName} (${v.assignedDriver.phoneNumber})`
                        : "No driver assigned"}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {v.authorityRef}
                      {v.ownerName ? ` · ${v.ownerName}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/tracas/${v.id}/letter`}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-secondary text-foreground font-semibold rounded-lg hover:bg-secondary/70 transition-colors">
                      <FileText className="w-3.5 h-3.5" />
                      Review letter
                    </Link>

                    {stage && (
                      <>
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleApprove(v)}
                          className="gap-1.5 cursor-pointer">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve &amp; sign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => {
                            setDeclineTarget(v);
                            setDeclineReason("");
                          }}
                          className="gap-1.5 cursor-pointer text-red-500 hover:text-red-500">
                          <XCircle className="w-3.5 h-3.5" />
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Declined letters — visible so corrections can be chased */}
      {recentlyDeclined.length > 0 && (
        <Card className="bg-card border-border/60">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border/60">
              <h2 className="font-semibold text-foreground">
                Declined ({counts.declined})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Returned to the enumerator for correction.
              </p>
            </div>
            <ul className="divide-y divide-border/50">
              {recentlyDeclined.map((v) => (
                <li
                  key={v.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {v.registrationNumber}
                      </span>
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold">
                        Declined at {v.declinedAtStage ?? "—"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {v.declineReason ?? "No reason recorded."}
                    </p>
                  </div>
                  {(role === "SYSTEM_ADMIN" || role === "TRACAS_MD") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => run(() => resubmitLetterForApproval(v.id))}
                      className="gap-1.5 cursor-pointer flex-shrink-0">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Resubmit to MD
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent TRACAS activity, read from the audit trail */}
      {overview && overview.activity.length > 0 && (
        <Card className="bg-card border-border/60">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border/60 flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">
                Recent TRACAS activity
              </h2>
            </div>
            <ul className="divide-y divide-border/50">
              {overview.activity.map((a) => (
                <li
                  key={a.id}
                  className="px-4 py-2.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {a.description ?? a.action}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {a.actor}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {new Date(a.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Decline reason capture — a reason is mandatory server-side too */}
      <Dialog
        open={!!declineTarget}
        onOpenChange={(open) => !open && setDeclineTarget(null)}>
        <DialogContent className="max-w-md bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <XCircle className="w-5 h-5 text-red-500" />
              Decline Letter of Authority
            </DialogTitle>
            <DialogDescription>
              {declineTarget?.registrationNumber} ({declineTarget?.fleetNumber})
              will be returned to the enumerator for correction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-1">
            <Label htmlFor="declineReason">Reason *</Label>
            <textarea
              id="declineReason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              placeholder="e.g. Chassis number does not match the vehicle particulars."
              className="w-full rounded-xl border border-border bg-background/50 p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeclineTarget(null)}
              className="cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={handleDeclineConfirm}
              disabled={isPending || !declineReason.trim()}
              className="cursor-pointer bg-red-600 hover:bg-red-500 text-white">
              Confirm decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Label/value line inside an overview card. */
function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-bold ${accent ?? "text-foreground"}`}>{value}</dd>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tint,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tint: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`bg-card ${highlight ? "border-primary/50 ring-1 ring-primary/30" : "border-border/60"}`}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${tint}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}
