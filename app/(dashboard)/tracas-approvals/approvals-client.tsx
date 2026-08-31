"use client";

import { useState, useTransition, useMemo } from "react";
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
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TracasNavTabs } from "@/components/tracas/tracas-nav-tabs";
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
  vioApproveLetter,
  vioDeclineLetter,
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
  initialQuery = "",
}: {
  data: ApprovalQueueData;
  overview: TracasOverview | null;
  role: string;
  initialQuery?: string;
  initialModule?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [declineTarget, setDeclineTarget] =
    useState<ApprovalQueueVehicle | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>("ALL");

  const { stage, pending, counts, recentlyDeclined } = data;

  const stageLabel =
    stage === "VIO"
      ? "Awaiting your verification as Vehicle Inspection Officer"
      : stage === "MD"
        ? "Awaiting your approval as Ag. MD/CEO"
      : stage === "COMMISSIONER"
        ? "Awaiting your approval as Commissioner"
        : "TRACAS Letters in the approval chain (view only)";

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
      stage === "VIO"
        ? vioApproveLetter(v.id)
        : stage === "MD"
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
      stage === "VIO"
        ? vioDeclineLetter(id, reason)
        : stage === "MD"
          ? mdDeclineLetter(id, reason)
          : commissionerDeclineLetter(id, reason),
    );
  };

  const filteredPending = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return pending.filter((v) => {
      if (enrollmentFilter !== "ALL" && v.enrollmentType !== enrollmentFilter) {
        return false;
      }
      if (!q) return true;

      const text = [
        v.registrationNumber,
        v.fleetNumber,
        v.authorityRef,
        v.category,
        v.makeModel ?? "",
        v.ownerName ?? "",
        v.assignedRoute ?? "",
        v.assignedDriver?.fullName ?? "",
        v.assignedDriver?.phoneNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [pending, searchQuery, enrollmentFilter]);

  const filteredDeclined = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentlyDeclined;

    return recentlyDeclined.filter((v) => {
      const text = [
        v.registrationNumber,
        v.fleetNumber,
        v.authorityRef,
        v.ownerName ?? "",
        v.assignedDriver?.fullName ?? "",
        v.assignedDriver?.phoneNumber ?? "",
        v.makeModel ?? "",
        v.declineReason ?? "",
        v.declinedAtStage ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [recentlyDeclined, searchQuery]);

  return (
    <div className="space-y-8 py-2">
      <TracasNavTabs role={role} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            TRACAS Letter Approvals
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

      {/* Chain overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Awaiting VIO"
          value={counts.pendingVio}
          icon={<ShieldCheck className="w-5 h-5 text-purple-500" />}
          tint="bg-purple-500/10"
          highlight={stage === "VIO"}
        />
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

      {/* Fleet-wide overview */}
      {overview && (
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
      )}

      {/* ── Search & Filter Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchQuery("");
            }}
            placeholder="Search by plate, fleet no, driver, owner, ref code..."
            className="pl-10 pr-9 bg-card border-border/70 rounded-xl h-10 text-sm placeholder:text-muted-foreground/70"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-md">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={enrollmentFilter}
            onChange={(e) => setEnrollmentFilter(e.target.value)}
            aria-label="Filter by enrolment type"
            className="h-10 px-3 text-xs font-medium rounded-xl border border-border/70 bg-card text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="ALL">All Enrolment Types</option>
            <option value="NEW_JOINER">New Joiners</option>
            <option value="EXISTING">Existing Fleet</option>
          </select>

          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setEnrollmentFilter("ALL");
              }}
              className="h-10 text-xs text-muted-foreground hover:text-foreground">
              Reset search
            </Button>
          )}
        </div>
      </div>

      {/* Action queue */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <span>
                  {stage ? "Your Queue" : "In the TRACAS Approval Chain"}
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {filteredPending.length}
                  {searchQuery && ` of ${pending.length}`}
                </Badge>
              </h2>
              {searchQuery && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Filtering for &quot;{searchQuery}&quot;
                </p>
              )}
            </div>
          </div>

          {filteredPending.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="p-3 rounded-full bg-muted/30 text-muted-foreground">
                <Search className="w-6 h-6" />
              </div>
              {searchQuery || enrollmentFilter !== "ALL" ? (
                <>
                  <p className="font-medium text-foreground">
                    No vehicles match your search
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try searching by registration number, fleet number, or
                    driver name.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setEnrollmentFilter("ALL");
                    }}
                    className="mt-2 text-xs">
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">
                    Nothing awaiting approval
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All caught up. New onboarding submissions will land here
                    once ready.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {filteredPending.map((v) => (
                <li
                  key={v.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-muted/15 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">
                        {v.registrationNumber}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {v.fleetNumber}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {v.authorityRef}
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
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>{v.makeModel ?? "Vehicle"}</span>
                      <span className="text-border">·</span>
                      <span>{v.category}</span>
                      {v.assignedRoute && (
                        <>
                          <span className="text-border">·</span>
                          <span>Route: {v.assignedRoute}</span>
                        </>
                      )}
                      {v.ownerName && (
                        <>
                          <span className="text-border">·</span>
                          <span>Owner: {v.ownerName}</span>
                        </>
                      )}
                    </p>

                    {v.assignedDriver ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Driver: {v.assignedDriver.fullName} (
                        {v.assignedDriver.phoneNumber})
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-500 mt-0.5">
                        No driver assigned yet
                      </p>
                    )}
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
                          {stage === "VIO" ? "Verify" : "Approve & sign"}
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

      {/* Declined letters — visible so the MD/Admin can see what got kicked back */}
      {filteredDeclined.length > 0 && (
        <Card className="bg-card border-border/60">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <span>Declined Letters</span>
                  <Badge variant="outline" className="text-red-500 font-mono text-xs">
                    {filteredDeclined.length}
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Returned to the enumerator for correction.
                </p>
              </div>
            </div>
            <ul className="divide-y divide-border/50">
              {filteredDeclined.map((v) => (
                <li
                  key={v.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">
                        {v.registrationNumber}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {v.fleetNumber}
                      </Badge>
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
                      Resubmit to VIO
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent TRACAS activity */}
      {overview && overview.activity.length > 0 && (
        <Card className="bg-card border-border/60">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border/60 flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">
                Recent TRACAS Activity
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

      {/* Decline reason modal */}
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
              placeholder="e.g. Chassis number does not match vehicle particulars."
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
      className={`bg-card transition-all ${
        highlight
          ? "border-primary/60 ring-1 ring-primary/40 shadow-sm"
          : "border-border/60"
      }`}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${tint}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}
