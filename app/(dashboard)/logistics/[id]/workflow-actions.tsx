"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hodOpsReviewLogistics,
  psApproveLogistics,
  commissionerApproveLogistics,
  rejectLogisticsApplicant,
} from "@/app/actions/logistics";
import type { ApplicationStatus } from "@prisma/client";

export default function LogisticsWorkflowActions({
  applicantId,
  status,
  role,
  monthlyFeeAmount,
}: {
  applicantId: string;
  status: ApplicationStatus;
  role: string;
  /** Kobo — the fee as it currently stands, set by HOD Operations. */
  monthlyFeeAmount: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [monthlyFee, setMonthlyFee] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const currentFeeNaira = monthlyFeeAmount != null ? monthlyFeeAmount / 100 : null;
  const [psFee, setPsFee] = useState(currentFeeNaira != null ? String(currentFeeNaira) : "");
  const [commFee, setCommFee] = useState(currentFeeNaira != null ? String(currentFeeNaira) : "");
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const isHodOps = ["HOD_TRANSPORT_OPS", "SYSTEM_ADMIN"].includes(role);
  const isPs = ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"].includes(role);
  const isComm = ["COMMISSIONER", "SYSTEM_ADMIN"].includes(role);

  const canReject =
    (status === "SUBMITTED" && isHodOps) ||
    (status === "PENDING_PS_APPROVAL" && isPs) ||
    (status === "PENDING_COMMISSIONER_APPROVAL" && isComm);

  const handleHodOps = () => {
    const fee = Number(monthlyFee);
    if (!fee || fee <= 0) {
      toast.error("Set the monthly fee.");
      return;
    }
    if (!recommendation.trim()) {
      toast.error("Write a recommendation.");
      return;
    }
    startTransition(async () => {
      const res = await hodOpsReviewLogistics(applicantId, fee, recommendation);
      if (res.success) {
        toast.success("Forwarded to the Permanent Secretary.");
        router.refresh();
      } else {
        toast.error(res.error || "Could not forward.");
      }
    });
  };

  const handlePs = () => {
    const fee = Number(psFee);
    if (!fee || fee <= 0) {
      toast.error("Set the monthly fee.");
      return;
    }
    startTransition(async () => {
      const res = await psApproveLogistics(applicantId, fee);
      if (res.success) {
        toast.success("Forwarded to the Commissioner.");
        router.refresh();
      } else {
        toast.error(res.error || "Could not approve.");
      }
    });
  };

  const handleCommissioner = () => {
    const fee = Number(commFee);
    if (!fee || fee <= 0) {
      toast.error("Set the monthly fee.");
      return;
    }
    startTransition(async () => {
      const res = await commissionerApproveLogistics(applicantId, fee);
      if (res.success) {
        toast.success(`Approved. Reference ${res.permitNumber}.`);
        router.refresh();
      } else {
        toast.error(res.error || "Could not approve.");
      }
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    startTransition(async () => {
      const res = await rejectLogisticsApplicant(applicantId, rejectReason);
      if (res.success) {
        toast.success("Rejected.");
        setRejecting(false);
        setRejectReason("");
        router.refresh();
      } else {
        toast.error(res.error || "Could not reject.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {status === "SUBMITTED" && isHodOps && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-900 dark:text-amber-200">
              HOD Operations — Set the fee and recommend
            </CardTitle>
            <CardDescription>
              Set the monthly fee and record your recommendation. It goes to the Permanent
              Secretary.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="space-y-1.5 max-w-xs">
              <Label htmlFor="monthlyFee">Monthly fee (₦)</Label>
              <Input
                id="monthlyFee"
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                placeholder="e.g. 15000"
              />
            </div>
            <textarea
              rows={3}
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="Your recommendation on this application."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <Button
              onClick={handleHodOps}
              disabled={isPending}
              className="w-fit bg-amber-600 hover:bg-amber-700 text-white">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Forward to Permanent Secretary
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "PENDING_PS_APPROVAL" && isPs && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900 dark:text-blue-200">
              Permanent Secretary — Approve
            </CardTitle>
            <CardDescription>
              Adjust the monthly fee if needed, then forward to the Commissioner.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="space-y-1.5 max-w-xs">
              <Label htmlFor="psFee">Monthly fee (₦)</Label>
              <Input id="psFee" type="number" value={psFee} onChange={(e) => setPsFee(e.target.value)} />
            </div>
            <Button
              onClick={handlePs}
              disabled={isPending}
              className="w-fit bg-blue-600 hover:bg-blue-700 text-white">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Forward to Commissioner
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "PENDING_COMMISSIONER_APPROVAL" && isComm && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-900 dark:text-emerald-200">
              Commissioner — Final approval
            </CardTitle>
            <CardDescription>
              Adjust the monthly fee if needed. Approving issues the reference number and
              makes the letter ready to print.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="space-y-1.5 max-w-xs">
              <Label htmlFor="commFee">Monthly fee (₦)</Label>
              <Input id="commFee" type="number" value={commFee} onChange={(e) => setCommFee(e.target.value)} />
            </div>
            <Button
              onClick={handleCommissioner}
              disabled={isPending}
              className="w-fit bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          </CardContent>
        </Card>
      )}

      {canReject && !rejecting && (
        <Button variant="outline" size="sm" className="w-fit text-destructive" onClick={() => setRejecting(true)}>
          Reject
        </Button>
      )}
      {canReject && rejecting && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reject this application</CardTitle>
            <CardDescription>A reason is required.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this application being rejected?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleReject} disabled={isPending || !rejectReason.trim()}>
                Reject application
              </Button>
              <Button variant="outline" onClick={() => setRejecting(false)} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
