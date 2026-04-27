"use client";

/**
 * Schedule Terminal Inspection — Ministry of Transport Platform
 * STORY-045 | FR-023
 *
 * HOD Parks/Revalidation schedules the terminal/depot inspection.
 * SLA: inspection must be completed within 5 working days (FR-023).
 *
 * Access: HOD_PARKS, HOD_PARKS_REVALIDATION, HOD_VIS, HOD_TRANSPORT_OPS,
 *         COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  scheduleTerminalInspection,
  getFleetInspectors,
} from "@/app/actions/mass-transit";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type SchedState = ActionResult<{ inspectionId: string }> | undefined;

export default function ScheduleInspectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const [inspectors, setInspectors] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([]);
  const [inspectorId, setInspectorId] = useState("");
  const [inspectionType, setInspectionType] = useState("INITIAL");

  const [state, action, isPending] = useActionState<SchedState, FormData>(
    scheduleTerminalInspection as (
      s: SchedState,
      f: FormData,
    ) => Promise<SchedState>,
    undefined,
  );

  useEffect(() => {
    getFleetInspectors().then((r) => {
      if (r.success) setInspectors(r.data!);
    });
  }, []);

  useEffect(() => {
    if (state?.success) {
      router.push(`/fleet-operators/${companyId}`);
    }
  }, [state, companyId, router]);

  const err = state && !state.success ? state.error : undefined;

  // Minimum date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1">
          <Link href="/fleet-operators" className="hover:underline">
            Fleet Operators
          </Link>
          {" / "}
          <Link
            href={`/fleet-operators/${companyId}`}
            className="hover:underline">
            Company
          </Link>
          {" / "}
          <span>Schedule Inspection</span>
        </nav>
        <h1 className="text-2xl font-semibold">Schedule Terminal Inspection</h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-023: Inspection must be completed within 5 working days of
          Commissioner endorsement.
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-sm">
          The 5-working-day SLA deadline will be automatically calculated from
          the scheduled date.
        </AlertDescription>
      </Alert>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <form action={action}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspection Details</CardTitle>
            <CardDescription>
              Assign a Field Inspector and set the inspection date
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <input type="hidden" name="companyId" value={companyId} />

            <div className="space-y-1.5">
              <Label htmlFor="inspectionType">Inspection Type</Label>
              <Select
                name="inspectionType"
                value={inspectionType}
                onValueChange={setInspectionType}>
                <SelectTrigger id="inspectionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INITIAL">Initial Inspection</SelectItem>
                  <SelectItem value="RE_INSPECTION">Re-Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scheduledDate">
                Scheduled Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                min={minDate}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignedToUserId">
                Assigned Inspector <span className="text-destructive">*</span>
              </Label>
              <Select
                name="assignedToUserId"
                value={inspectorId}
                onValueChange={setInspectorId}
                required>
                <SelectTrigger id="assignedToUserId">
                  <SelectValue placeholder="Select field inspector" />
                </SelectTrigger>
                <SelectContent>
                  {inspectors.length === 0 && (
                    <SelectItem value="_" disabled>
                      No inspectors available
                    </SelectItem>
                  )}
                  {inspectors.map((ins) => (
                    <SelectItem key={ins.id} value={ins.id}>
                      {ins.firstName} {ins.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inspectorStationLocation">
                Inspector Station Location (optional)
              </Label>
              <Input
                id="inspectorStationLocation"
                name="inspectorStationLocation"
                placeholder="e.g. Awka Station"
              />
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button type="submit" disabled={isPending || !inspectorId}>
                {isPending ? "Scheduling…" : "Schedule Inspection"}
              </Button>
              <Button asChild variant="outline" disabled={isPending}>
                <Link href={`/fleet-operators/${companyId}`}>Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
