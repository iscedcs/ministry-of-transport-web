"use client";

/**
 * Inspection Scheduling Page — Ministry of Transport Platform
 * STORY-023 | FR-011
 *
 * HOD Parks (and above) assigns a field inspector + date/time
 * for an initial or follow-up inspection of a motor park.
 *
 * Access: HOD_PARKS, HOD_VIS, HOD_TRANSPORT_OPS, HOD_PARKS_REVALIDATION,
 *         COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { scheduleParkInspection } from "@/app/actions/motor-park";
import { getFieldInspectors } from "@/app/actions/motor-park";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ── Types ──────────────────────────────────────────────────────────────────────

type Inspector = {
  id: string;
  firstName: string;
  lastName: string;
  stationLocation: string | null;
};

type ScheduleState = ActionResult<{ inspectionId: string }> | undefined;

// ── Page ────────────────────────────────────────────────────────────────────────

export default function ScheduleInspectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loadingInspectors, setLoadingInspectors] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [leadId, setLeadId] = useState("");

  // Load field inspectors on mount
  useEffect(() => {
    getFieldInspectors().then((result) => {
      if (result.success) setInspectors(result.data ?? []);
      setLoadingInspectors(false);
    });
  }, []);

  // Redirect to detail page on success
  const [state, action, isPending] = useActionState<ScheduleState, FormData>(
    scheduleParkInspection as (
      s: ScheduleState,
      f: FormData,
    ) => Promise<ScheduleState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/motor-parks/${parkId}`);
    }
  }, [state, parkId, router]);

  const err = state && !state.success ? state.error : undefined;

  // Minimum date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href="/motor-parks"
            className="hover:text-foreground transition-colors">
            Motor Parks
          </Link>
          <span>/</span>
          <Link
            href={`/motor-parks/${parkId}`}
            className="hover:text-foreground transition-colors">
            Application
          </Link>
          <span>/</span>
          <span className="text-foreground">Schedule Inspection</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Schedule Inspection
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-011 — Assign a field inspector and set the inspection date.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <form action={action} noValidate>
        {/* Hidden park ID */}
        <input type="hidden" name="parkId" value={parkId} />
        <input type="hidden" name="linkedEntityType" value="MOTOR_PARK" />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspection Details</CardTitle>
            <CardDescription>
              Select the inspection type, assign an inspector, and set the date.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Inspection type */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inspectionType">Inspection Type</Label>
              <Select name="inspectionType" defaultValue="INITIAL" required>
                <SelectTrigger id="inspectionType">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INITIAL">Initial Inspection</SelectItem>
                  <SelectItem value="RE_INSPECTION">Re-Inspection</SelectItem>
                  <SelectItem value="REVALIDATION">Revalidation</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inspection team — a lead plus at least one other officer. The
                HOD signing in attends automatically and is counted toward
                the team without needing to tick their own name. */}
            <div className="flex flex-col gap-1.5">
              <Label>Inspection Team</Label>
              {loadingInspectors ? (
                <div className="h-20 rounded-md border border-border bg-secondary/30 animate-pulse" />
              ) : inspectors.length === 0 ? (
                <p className="text-sm text-destructive">
                  No active field inspectors found. Please ensure inspector
                  accounts are provisioned.
                </p>
              ) : (
                <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                  {inspectors.map((i) => (
                    <label key={i.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="memberIds"
                        value={i.id}
                        checked={selectedMembers.includes(i.id)}
                        onChange={(e) => {
                          setSelectedMembers((prev) =>
                            e.target.checked
                              ? [...prev, i.id]
                              : prev.filter((id) => id !== i.id),
                          );
                          if (!e.target.checked && leadId === i.id) setLeadId("");
                        }}
                      />
                      {i.firstName} {i.lastName}
                      {i.stationLocation ? ` — ${i.stationLocation}` : ""}
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                You attend automatically. Select at least one other officer (up to three).
              </p>
            </div>

            {/* Lead inspector */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leadId">Lead Inspector</Label>
                <Select name="leadId" required value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger id="leadId">
                    <SelectValue placeholder="Who leads the visit?" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectors
                      .filter((i) => selectedMembers.includes(i.id))
                      .map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.firstName} {i.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The lead files the checklist and findings; the rest leave a comment.
                </p>
              </div>
            )}

            {/* Scheduled date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduledDate">Inspection Date</Label>
              <Input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                min={minDateStr}
                required
              />
            </div>

            {/* Inspector station */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inspectorStationLocation">
                Station / Meeting Point{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="inspectorStationLocation"
                name="inspectorStationLocation"
                type="text"
                placeholder="e.g. Awka Area Command, Anambra"
              />
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href={`/motor-parks/${parkId}`}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={
              isPending ||
              loadingInspectors ||
              inspectors.length === 0 ||
              selectedMembers.length === 0 ||
              !leadId
            }
            aria-busy={isPending}>
            {isPending ? "Scheduling…" : "Confirm Schedule"}
          </Button>
        </div>
      </form>
    </div>
  );
}
