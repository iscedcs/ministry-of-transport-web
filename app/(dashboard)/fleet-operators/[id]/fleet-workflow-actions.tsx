"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Clock, Send } from "lucide-react";
import Link from "next/link";
import {
  hodApproveFleetOperator,
  psApproveFleetOperator,
} from "@/app/actions/mass-transit";

export function FleetWorkflowActions({
  companyId,
  status,
  role,
  initialMonthlyLevyKobo,
}: {
  companyId: string;
  status: string;
  role: string;
  initialMonthlyLevyKobo?: number | null;
}) {
  const [isPending, startTransition] = useTransition();

  // PS levy adjustment state (in Naira)
  const initialNaira = initialMonthlyLevyKobo ? Math.round(initialMonthlyLevyKobo / 100) : "";
  const [monthlyLevy, setMonthlyLevy] = useState<number | "">(initialNaira);
  const [psNotes, setPsNotes] = useState("");

  const isHod =
    ["HOD_TRANSPORT_OPS", "HOD_PARKS", "HOD_PARKS_REVALIDATION", "SYSTEM_ADMIN"].includes(role);
  const isPs = ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"].includes(role);
  const isComm = ["COMMISSIONER", "SYSTEM_ADMIN"].includes(role);

  const handleHodApprove = () => {
    startTransition(async () => {
      const res = await hodApproveFleetOperator(companyId);
      if (res.success) {
        toast.success("Signed & forwarded to Permanent Secretary");
      } else {
        toast.error(res.error || "Failed to process HOD approval");
      }
    });
  };

  const handlePsApprove = () => {
    startTransition(async () => {
      const levyValue = typeof monthlyLevy === "number" ? monthlyLevy : undefined;
      const res = await psApproveFleetOperator(companyId, levyValue, psNotes);
      if (res.success) {
        toast.success("Recommendation & adjusted levy submitted to Commissioner!");
      } else {
        toast.error(res.error || "Failed to process Permanent Secretary recommendation");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 my-4">
      {/* HOD Approval Action */}
      {(status === "PENDING_HOD_APPROVAL" || status === "INSPECTION_COMPLETED") && isHod && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-900 dark:text-amber-200">
              HOD Transport Ops Approval & Forwarding
            </CardTitle>
            <CardDescription>
              Review terminal inspection report and sign to forward application to the Permanent Secretary.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button onClick={handleHodApprove} disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sign & Forward to Permanent Secretary
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PS Recommendation & Levy Adjustment Action (ENG-227) */}
      {status === "PENDING_PS_APPROVAL" && isPs && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900 dark:text-blue-200 flex items-center space-x-2">
              <Send className="w-5 h-5 text-blue-500" />
              <span>Permanent Secretary Recommendation & Levy Adjustment</span>
            </CardTitle>
            <CardDescription>
              Review HOD grade & findings. You can adjust (raise or lower) the suggested monthly levy below. Your recommendation will be forwarded to the Commissioner for final sign-off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fleet-monthly-levy" className="text-xs font-semibold">
                  Finalized Monthly Levy (₦)
                </Label>
                <Input
                  id="fleet-monthly-levy"
                  type="number"
                  placeholder="e.g. 50000"
                  value={monthlyLevy}
                  onChange={(e) => setMonthlyLevy(e.target.value ? Number(e.target.value) : "")}
                  className="bg-background border-border"
                />
                <p className="text-[11px] text-muted-foreground">
                  Adjust levy up or down before submitting.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fleet-ps-notes" className="text-xs font-semibold">
                  Recommendation Notes for Commissioner
                </Label>
                <Textarea
                  id="fleet-ps-notes"
                  rows={2}
                  placeholder="Add notes or rationale for the Commissioner..."
                  value={psNotes}
                  onChange={(e) => setPsNotes(e.target.value)}
                  className="bg-background border-border text-xs"
                />
              </div>
            </div>

            <Button onClick={handlePsApprove} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Recommendation to Commissioner
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Commissioner Approval Action (ENG-220) */}
      {status === "PENDING_COMMISSIONER_APPROVAL" && isComm && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-900 dark:text-emerald-200">
              Hon. Commissioner Final Sign-off & Permit to Operate
            </CardTitle>
            <CardDescription>
              Review complete fleet dossier & Permanent Secretary recommendation, then give final approval to append digital signature and issue Permit to Operate.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <Link href={`/fleet-operators/${companyId}/issue-permit`}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Issue Permit to Operate
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Waiting Status Indicators */}
      {(status === "PENDING_HOD_APPROVAL" || status === "INSPECTION_COMPLETED") && !isHod && (
        <Card className="bg-muted/40">
          <CardContent className="pt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" /> Awaiting HOD review and sign-off
          </CardContent>
        </Card>
      )}
      {status === "PENDING_PS_APPROVAL" && !isPs && (
        <Card className="bg-muted/40">
          <CardContent className="pt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" /> Awaiting Permanent Secretary recommendation
          </CardContent>
        </Card>
      )}
      {status === "PENDING_COMMISSIONER_APPROVAL" && !isComm && (
        <Card className="bg-muted/40">
          <CardContent className="pt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" /> Awaiting Hon. Commissioner final approval
          </CardContent>
        </Card>
      )}
    </div>
  );
}
