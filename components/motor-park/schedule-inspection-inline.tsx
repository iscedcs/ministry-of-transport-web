"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMotorParkTeamCandidates,
  scheduleParkInspection,
} from "@/app/actions/motor-park";

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
}

const MAX_TEAM = 4;
const SELECTABLE_LIMIT = MAX_TEAM - 1;

/**
 * Schedule the inspection team inline, on the park's own page — the exact
 * pattern used for mass transit terminals: the HOD of Operations always
 * attends and may lead the visit themselves or name one of up to three
 * others, drawn from the same officer pool (field inspectors, VIOs, HODs,
 * park monitors) mass transit draws from.
 */
export function ScheduleInspectionInline({
  parkId,
  currentUserId,
}: {
  parkId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [leadId, setLeadId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [station, setStation] = useState("");

  const openForm = () => {
    setOpen(true);
    if (candidates.length === 0) {
      setLoadingCandidates(true);
      getMotorParkTeamCandidates().then((res) => {
        if (res.success) setCandidates(res.data ?? []);
        setLoadingCandidates(false);
      });
    }
  };

  const toggleMember = (userId: string) => {
    setSelected((prev) => {
      if (prev.includes(userId)) {
        if (leadId === userId) setLeadId("");
        return prev.filter((x) => x !== userId);
      }
      if (prev.length >= SELECTABLE_LIMIT) return prev;
      return [...prev, userId];
    });
  };

  const submit = () => {
    if (selected.length === 0) {
      toast.error("Select at least one other officer besides yourself.");
      return;
    }
    if (!leadId) {
      toast.error("Choose who leads the visit.");
      return;
    }
    if (!scheduledDate) {
      toast.error("Choose an inspection date.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("parkId", parkId);
      fd.set("inspectionType", "INITIAL");
      fd.set("scheduledDate", scheduledDate);
      fd.set("inspectorStationLocation", station);
      fd.set("leadId", leadId);
      selected.forEach((id) => fd.append("memberIds", id));

      const res = await scheduleParkInspection({ success: true }, fd);
      if (res.success) {
        toast.success("Inspection scheduled.");
        setOpen(false);
        setSelected([]);
        setLeadId("");
        setScheduledDate("");
        setStation("");
        router.refresh();
      } else {
        toast.error(res.error || "Could not schedule the inspection.");
      }
    });
  };

  if (!open) {
    return (
      <Button size="sm" onClick={openForm} className="gap-1.5">
        <CalendarClock className="h-3.5 w-3.5" />
        Schedule Inspection
      </Button>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Schedule Inspection</CardTitle>
        <CardDescription>
          Pick the team and the date. You attend automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Date of visit</span>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Station (optional)
            </span>
            <input
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="e.g. Awka Area Command, Anambra"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Inspection team ({1 + selected.length} of {MAX_TEAM} selected)
          </p>
          <p className="text-xs text-muted-foreground">
            You attend automatically as the HOD of Operations, and you may lead
            the visit yourself or name one of the others. Only the lead files
            the checklist; the rest leave comments.
          </p>

          {loadingCandidates ? (
            <div className="h-16 rounded-md border border-border bg-secondary/30 animate-pulse" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {/* The HOD (the signed-in officer) sits at the top as a fixed
                  row, mirroring the mass transit panel: the slot is theirs
                  and the Lead toggle is right there. */}
              <div
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-sm",
                  leadId === currentUserId
                    ? "border-primary bg-primary/5"
                    : "border-border bg-secondary/40",
                )}>
                <div>
                  <p className="font-medium">You (HOD Operations)</p>
                  <p className="text-xs text-muted-foreground">
                    Always attends - cannot be removed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLeadId(leadId === currentUserId ? "" : currentUserId)
                  }
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                    leadId === currentUserId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary",
                  )}>
                  {leadId === currentUserId ? "★ Lead" : "Set as lead"}
                </button>
              </div>

              {candidates.length === 0 ? (
                <p className="text-sm text-destructive">
                  No other officers found. Field inspectors, VIOs or park
                  monitors need to be provisioned.
                </p>
              ) : (
                candidates.map((i) => {
                  const picked = selected.includes(i.id);
                  const full = !picked && selected.length >= SELECTABLE_LIMIT;
                  return (
                    <label
                      key={i.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                        picked ? "border-primary bg-primary/5" : "border-border",
                        full
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer hover:bg-secondary/50",
                      )}>
                      <input
                        type="checkbox"
                        checked={picked}
                        disabled={full}
                        onChange={() => toggleMember(i.id)}
                      />
                      <span>
                        {i.firstName} {i.lastName}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          )}

          <label className="mt-1 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Lead inspector</span>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="h-[38px] w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">Select the lead</option>
              <option value={currentUserId}>You (HOD Operations)</option>
              {candidates
                .filter((i) => selected.includes(i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.firstName} {i.lastName}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          <Button onClick={submit} disabled={isPending} size="sm">
            {isPending ? "Scheduling..." : "Schedule"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
