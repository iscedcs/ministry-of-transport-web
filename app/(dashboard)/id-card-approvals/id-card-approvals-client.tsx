"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  IdCard,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Clock,
  Printer,
  ClipboardCheck,
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
  vioApproveIdCard,
  vioDeclineIdCard,
  mdApproveIdCard,
  mdDeclineIdCard,
  commissionerApproveIdCard,
  commissionerDeclineIdCard,
  resubmitIdCard,
  type IdCardQueueData,
  type IdCardQueueDriver,
} from "@/app/actions/tracas-id-cards";

const STAGE_COPY = {
  VIO: "Awaiting your verification as Vehicle Inspection Officer",
  MD: "Awaiting your signature as Ag. MD/CEO",
  COMMISSIONER: "Awaiting your signature as Commissioner",
} as const;

export function IdCardApprovalsClient({
  data,
  role,
}: {
  data: IdCardQueueData;
  role: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [declineTarget, setDeclineTarget] = useState<IdCardQueueDriver | null>(
    null,
  );
  const [declineReason, setDeclineReason] = useState("");

  const { stage, pending, counts, recentlyDeclined } = data;

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        toast.success("ID card updated.");
        setDeclineTarget(null);
        setDeclineReason("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Action failed.");
      }
    });
  };

  const approve = (d: IdCardQueueDriver) =>
    run(() =>
      stage === "VIO"
        ? vioApproveIdCard(d.id)
        : stage === "MD"
          ? mdApproveIdCard(d.id)
          : commissionerApproveIdCard(d.id),
    );

  const confirmDecline = () => {
    if (!declineTarget) return;
    if (!declineReason.trim()) {
      toast.error("Please give a reason for declining.");
      return;
    }
    const id = declineTarget.id;
    const reason = declineReason.trim();
    run(() =>
      stage === "VIO"
        ? vioDeclineIdCard(id, reason)
        : stage === "MD"
          ? mdDeclineIdCard(id, reason)
          : commissionerDeclineIdCard(id, reason),
    );
  };

  return (
    <div className="space-y-8 py-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Driver ID Card Approvals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stage
            ? STAGE_COPY[stage]
            : "Cards moving through the approval chain (view only)"}
        </p>
      </div>

      {/* Chain overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat
          label="Awaiting VIO"
          value={counts.pendingVio}
          icon={<ClipboardCheck className="w-5 h-5 text-purple-500" />}
          tint="bg-purple-500/10"
          highlight={stage === "VIO"}
        />
        <Stat
          label="Awaiting MD"
          value={counts.pendingMd}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          tint="bg-amber-500/10"
          highlight={stage === "MD"}
        />
        <Stat
          label="Awaiting Commissioner"
          value={counts.pendingCommissioner}
          icon={<ShieldCheck className="w-5 h-5 text-blue-500" />}
          tint="bg-blue-500/10"
          highlight={stage === "COMMISSIONER"}
        />
        <Stat
          label="Approved / printable"
          value={counts.approved}
          icon={<Printer className="w-5 h-5 text-emerald-500" />}
          tint="bg-emerald-500/10"
        />
        <Stat
          label="Declined"
          value={counts.declined}
          icon={<XCircle className="w-5 h-5 text-red-500" />}
          tint="bg-red-500/10"
        />
      </div>

      {/* Queue */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/60">
            <h2 className="font-semibold text-foreground">
              {stage ? "Your queue" : "In the chain"} ({pending.length})
            </h2>
            {stage === "VIO" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Verify the driver&apos;s particulars. Your approval does not
                place a signature on the card — it releases it to the MD.
              </p>
            )}
          </div>

          {pending.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Nothing awaiting approval. All caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {pending.map((d) => (
                <li
                  key={d.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                    {d.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.photoUrl}
                        alt={d.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">
                        {d.fullName[0]}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">
                        {d.fullName}
                      </span>
                      {d.securityCode && (
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]">
                          {d.securityCode}
                        </Badge>
                      )}
                      {d.idCardStatus === "PENDING_COMMISSIONER_APPROVAL" && (
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-bold">
                          MD signed
                        </Badge>
                      )}
                      {d.idCardStatus === "PENDING_MD_APPROVAL" && (
                        <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px] font-bold">
                          VIO verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {d.phoneNumber}
                      {d.licenseNumber ? ` · Licence ${d.licenseNumber}` : " · No licence on record"}
                      {d.operatorAssociation ? ` · ${d.operatorAssociation}` : ""}
                    </p>
                    {d.vehicles.length > 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {d.vehicles
                          .map((v) => `${v.registrationNumber} (${v.fleetNumber})`)
                          .join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/tracas/driver/${d.id}/id-card`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-secondary text-foreground font-semibold rounded-lg hover:bg-secondary/70 transition-colors">
                      <IdCard className="w-3.5 h-3.5" />
                      Review card
                    </Link>

                    {stage && (
                      <>
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => approve(d)}
                          className="gap-1.5 cursor-pointer">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {stage === "VIO" ? "Verify" : "Approve & sign"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => {
                            setDeclineTarget(d);
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

      {/* Declined */}
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
              {recentlyDeclined.map((d) => (
                <li
                  key={d.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">
                        {d.fullName}
                      </span>
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold">
                        Declined at {d.idDeclinedAtStage ?? "—"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {d.idDeclineReason ?? "No reason recorded."}
                    </p>
                  </div>
                  {(role === "SYSTEM_ADMIN" ||
                    role === "TRACAS_MD" ||
                    role === "VEHICLE_INSPECTION_OFFICER") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => run(() => resubmitIdCard(d.id))}
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

      {/* Decline reason */}
      <Dialog
        open={!!declineTarget}
        onOpenChange={(open) => !open && setDeclineTarget(null)}>
        <DialogContent className="max-w-md bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <XCircle className="w-5 h-5 text-red-500" />
              Decline ID Card
            </DialogTitle>
            <DialogDescription>
              {declineTarget?.fullName} will be returned to the enumerator for
              correction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-1">
            <Label htmlFor="idDeclineReason">Reason *</Label>
            <textarea
              id="idDeclineReason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              placeholder="e.g. Passport photograph is unclear; licence number does not match the record."
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
              onClick={confirmDecline}
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

function Stat({
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
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
            {label}
          </p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${tint} flex-shrink-0`}>{icon}</div>
      </CardContent>
    </Card>
  );
}
