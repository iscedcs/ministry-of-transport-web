"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import {
  hodApproveFleetOperator,
  psApproveFleetOperator,
} from "@/app/actions/mass-transit";

export function FleetWorkflowActions({
  companyId,
  status,
  role,
}: {
  companyId: string;
  status: string;
  role: string;
}) {
  const [isPending, startTransition] = useTransition();

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
      const res = await psApproveFleetOperator(companyId);
      if (res.success) {
        toast.success("Signed & forwarded to Commissioner");
      } else {
        toast.error(res.error || "Failed to process Permanent Secretary approval");
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

      {/* PS Approval Action */}
      {status === "PENDING_PS_APPROVAL" && isPs && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900 dark:text-blue-200">
              Permanent Secretary Signature
            </CardTitle>
            <CardDescription>
              Review findings and HOD sign-off, then sign to forward fleet application to the Commissioner.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button onClick={handlePsApprove} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sign & Forward to Commissioner
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Commissioner Approval Action */}
      {status === "PENDING_COMMISSIONER_APPROVAL" && isComm && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-900 dark:text-emerald-200">
              Hon. Commissioner Sign-off & Permit to Operate
            </CardTitle>
            <CardDescription>
              Review complete fleet dossier and give final approval to issue Permit to Operate.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href={`/fleet-operators/${companyId}/issue-permit`}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Issue Permit to Operate
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
            <Clock className="w-4 h-4" /> Awaiting Permanent Secretary signature
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
