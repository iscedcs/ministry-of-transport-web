"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  scheduleRevalidationInspection,
  psApproveInspectionSchedule,
  psRejectInspectionSchedule,
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
  const [evidence, setEvidence] = useState<{ url: string; caption?: string }[]>(
    [],
  );
  const [uploading, setUploading] = useState(false);

  /** Site evidence is mandatory — the report is worthless without it. */
  const handleEvidenceUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5MB.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "revalidation-evidence");
        fd.append("linkedToType", "REVALIDATION");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json?.url) {
          setEvidence((prev) => [...prev, { url: json.url, caption: file.name }]);
        } else {
          toast.error(json?.error ?? `Failed to upload ${file.name}`);
        }
      }
    } catch {
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

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
    if (evidence.length === 0)
      return toast.error("Upload at least one piece of site evidence");

    startTransition(async () => {
      const res = await submitRevalidationFindings(
        applicationId,
        findings,
        rec,
        evidence,
      );
      if (res.success) toast.success("Findings submitted to HOD");
      else toast.error(res.error ?? "Failed to submit findings");
    });
  };

  const handleClearSchedule = () => {
    startTransition(async () => {
      const res = await psApproveInspectionSchedule(applicationId);
      if (res.success) toast.success("Inspection cleared — released to inspector");
      else toast.error(res.error ?? "Failed to clear inspection");
    });
  };

  const handleRejectSchedule = () => {
    const reason = prompt("Why is this inspection schedule being rejected?");
    if (reason === null) return;
    if (!reason.trim()) return toast.error("A reason is required");
    startTransition(async () => {
      const res = await psRejectInspectionSchedule(applicationId, reason);
      if (res.success) toast.success("Returned to HOD to reschedule");
      else toast.error(res.error ?? "Failed to reject schedule");
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
  const isInspector = role === "FIELD_INSPECTOR" || role === "VEHICLE_INSPECTION_OFFICER" || role === "SYSTEM_ADMIN";
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

      {/* PS clears the inspection schedule before the inspector attends */}
      {status === "PENDING_PS_INSPECTION_APPROVAL" && isPs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approve Inspection Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The HOD has scheduled this inspection and assigned an officer.
              Clearing it releases the application to the inspector.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleClearSchedule} disabled={isPending}>
                {isPending ? "Working..." : "Approve inspection"}
              </Button>
              <Button
                variant="outline"
                onClick={handleRejectSchedule}
                disabled={isPending}
                className="text-red-600 hover:text-red-600">
                Reject &amp; return to HOD
              </Button>
            </div>
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
            <div className="space-y-2 mb-4">
            <label className="text-sm font-semibold">
              Site Evidence <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleEvidenceUpload}
              disabled={uploading || isPending}
              className="block w-full text-sm cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              Photographs or documents captured on site. Images or PDF, under
              5MB each.
            </p>
            {uploading && (
              <p className="text-xs text-primary">Uploading…</p>
            )}
            {evidence.length > 0 && (
              <ul className="space-y-1 pt-1">
                {evidence.map((ev, i) => (
                  <li
                    key={ev.url}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-xs">
                    <span className="truncate">{ev.caption ?? ev.url}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEvidence((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-red-500 hover:underline flex-shrink-0">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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

      {(status === "PENDING_HOD_APPROVAL" ||
        status === "INSPECTION_COMPLETED") && isHod && (
        <Card>
          <CardHeader>
            <CardTitle>HOD Approval</CardTitle>
            <CardDescription>Review inspector findings and sign to forward to Permanent Secretary.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => handleApprove(hodApproveRevalidation, "Forwarded to Permanent Secretary")} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sign & Forward
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>Reject</Button>
          </CardContent>
        </Card>
      )}

      {status === "PENDING_PS_APPROVAL" && isPs && (
        <Card>
          <CardHeader>
            <CardTitle>Permanent Secretary Signature</CardTitle>
            <CardDescription>Review findings and sign to forward to Commissioner.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => handleApprove(psApproveRevalidation, "Signed and forwarded to Commissioner")} disabled={isPending}>
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
            <CardDescription>Final signature to approve and generate Revalidation Number.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => handleApprove(commissionerApproveRevalidation, "Approved successfully!")} disabled={isPending} className="bg-green-600 hover:bg-green-700">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sign & Approve
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>Reject</Button>
          </CardContent>
        </Card>
      )}

      {/* Show waiting states for roles that can't act right now */}
      {status === "SUBMITTED" && !isHod && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for HOD to schedule inspection</CardContent></Card>}
      {status === "PENDING_PS_INSPECTION_APPROVAL" && !isPs && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for Permanent Secretary to approve the inspection schedule</CardContent></Card>}
      {status === "INSPECTION_SCHEDULED" && !isInspector && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for Inspector to submit findings</CardContent></Card>}
      {(status === "PENDING_HOD_APPROVAL" || status === "INSPECTION_COMPLETED") && !isHod && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for HOD signature</CardContent></Card>}
      {status === "PENDING_COMMISSIONER_APPROVAL" && !isComm && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for Commissioner signature</CardContent></Card>}
      {status === "PENDING_PS_APPROVAL" && !isPs && <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Waiting for Permanent Secretary signature</CardContent></Card>}

    </div>
  );
}
