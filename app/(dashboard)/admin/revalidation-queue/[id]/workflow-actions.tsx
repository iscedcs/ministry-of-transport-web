"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  scheduleRevalidationInspection,
  submitRevalidationFindings,
  hodApproveRevalidation,
  commissionerApproveRevalidation,
  psApproveRevalidation,
  rejectRevalidation
} from "@/app/actions/revalidation-workflow";

export function WorkflowActions({
  applicationId,
  status,
  role,
  inspectors,
  assignedInspectorId
}: {
  applicationId: string;
  status: string;
  role: string;
  inspectors: any[];
  assignedInspectorId: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const inspectorId = fd.get("inspectorId") as string;
    const date = fd.get("date") as string;

    if (!inspectorId || !date) return toast.error("Select an inspector and date");

    startTransition(async () => {
      const res = await scheduleRevalidationInspection(applicationId, inspectorId, date);
      if (res.success) toast.success("Inspection scheduled");
      else toast.error("Failed to schedule inspection");
    });
  };

  const handleFindings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const findings = fd.get("findings") as string;
    const rec = fd.get("recommendation") as string;

    if (!findings || !rec) return toast.error("Provide findings and recommendation");

    startTransition(async () => {
      const res = await submitRevalidationFindings(applicationId, findings, rec);
      if (res.success) toast.success("Findings submitted to HOD");
      else toast.error("Failed to submit findings");
    });
  };

  const handleApprove = async (actionFn: (id: string) => Promise<any>, successMsg: string) => {
    startTransition(async () => {
      const res = await actionFn(applicationId);
      if (res.success) toast.success(successMsg);
      else toast.error("Failed to process approval");
    });
  };

  const handleReject = () => {
    if (!confirm("Are you sure you want to reject this application?")) return;
    startTransition(async () => {
      const res = await rejectRevalidation(applicationId);
      if (res.success) toast.success("Application rejected");
      else toast.error("Failed to reject application");
    });
  };

  if (status === "APPROVED" || status === "REJECTED" || status === "REVOKED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Completed</CardTitle>
          <CardDescription>No further actions can be taken on this application.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isHod = role === "HOD_PARKS_REVALIDATION" || role === "SYSTEM_ADMIN";
  const isInspector = role === "FIELD_INSPECTOR" || role === "VEHICLE_INSPECTION_OFFICER" || isHod;
  const isComm = role === "COMMISSIONER" || role === "SYSTEM_ADMIN";
  const isPs = role === "PERMANENT_SECRETARY" || role === "SYSTEM_ADMIN";

  return (
    <div className="flex flex-col gap-4">
      {status === "SUBMITTED" && isHod && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Inspection</CardTitle>
            <CardDescription>Assign this facility to an inspector</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSchedule} className="flex flex-col gap-3">
              <div>
                <label className="text-sm block mb-1">Inspector</label>
                <select name="inspectorId" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" required>
                  <option value="">-- Select Inspector --</option>
                  {inspectors.map(i => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm block mb-1">Date</label>
                <input type="date" name="date" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" required />
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Schedule
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {status === "INSPECTION_SCHEDULED" && isInspector && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Findings</CardTitle>
            <CardDescription>Record inspection results</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFindings} className="flex flex-col gap-3">
              <div>
                <label className="text-sm block mb-1">Findings</label>
                <textarea name="findings" rows={4} className="flex w-full rounded-md border bg-background px-3 py-2 text-sm" required></textarea>
              </div>
              <div>
                <label className="text-sm block mb-1">Recommendation</label>
                <select name="recommendation" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" required>
                  <option value="">-- Select --</option>
                  <option value="Approved">Approved</option>
                  <option value="Approved with Conditions">Approved with Conditions</option>
                  <option value="Pending Compliance">Pending Compliance</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit to HOD
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {status === "PENDING_HOD_APPROVAL" && isHod && (
        <Card>
          <CardHeader>
            <CardTitle>HOD Approval</CardTitle>
            <CardDescription>Review inspector findings and sign to forward to Commissioner.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => handleApprove(hodApproveRevalidation, "Forwarded to Commissioner")} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sign & Forward
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>Reject</Button>
          </CardContent>
        </Card>
      )}

      {status === "PENDING_COMMISSIONER_APPROVAL" && isComm && (
        <Card>
          <CardHeader>
            <CardTitle>Commissioner Signature</CardTitle>
            <CardDescription>Sign to authorize this revalidation and forward to Permanent Secretary.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => handleApprove(commissionerApproveRevalidation, "Signed and forwarded to PS")} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sign
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>Reject</Button>
          </CardContent>
        </Card>
      )}

      {status === "PENDING_PS_APPROVAL" && isPs && (
        <Card>
          <CardHeader>
            <CardTitle>Permanent Secretary Signature</CardTitle>
            <CardDescription>Final signature to approve and generate Revalidation Number.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => handleApprove(psApproveRevalidation, "Approved successfully!")} disabled={isPending} className="bg-green-600 hover:bg-green-700">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sign & Approve
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>Reject</Button>
          </CardContent>
        </Card>
      )}

      {/* Show waiting states for roles that can't act right now */}
      {status === "SUBMITTED" && !isHod && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for HOD to schedule inspection</CardContent></Card>}
      {status === "INSPECTION_SCHEDULED" && !isInspector && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for Inspector to submit findings</CardContent></Card>}
      {status === "PENDING_HOD_APPROVAL" && !isHod && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for HOD signature</CardContent></Card>}
      {status === "PENDING_COMMISSIONER_APPROVAL" && !isComm && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for Commissioner signature</CardContent></Card>}
      {status === "PENDING_PS_APPROVAL" && !isPs && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for Permanent Secretary signature</CardContent></Card>}

    </div>
  );
}
