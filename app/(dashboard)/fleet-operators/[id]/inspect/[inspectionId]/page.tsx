"use client";

/**
 * Submit Terminal Inspection Report — Ministry of Transport Platform
 * STORY-045 | FR-023
 *
 * Field Inspector submits the terminal/depot inspection findings.
 * APPROVE or CONDITIONAL → INSPECTION_COMPLETED
 * REJECT → REJECTED
 *
 * Access: FIELD_INSPECTOR
 */

import { useActionState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { submitTerminalInspectionReport } from "@/app/actions/mass-transit";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

type ReportState = ActionResult | undefined;

export default function InspectTerminalPage() {
  const params = useParams<{ id: string; inspectionId: string }>();
  const router = useRouter();
  const { id: companyId, inspectionId } = params;

  const [state, action, isPending] = useActionState<ReportState, FormData>(
    submitTerminalInspectionReport as (
      s: ReportState,
      f: FormData,
    ) => Promise<ReportState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/fleet-operators/${companyId}`);
    }
  }, [state, companyId, router]);

  const err = state && !state.success ? state.error : undefined;

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
          <span>Inspection Report</span>
        </nav>
        <h1 className="text-2xl font-semibold">Terminal Inspection Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit your findings from the terminal / depot inspection.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <form action={action}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspection Findings</CardTitle>
            <CardDescription>
              Provide your overall assessment and recommendation
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="inspectionId" value={inspectionId} />

            <div className="space-y-1.5">
              <Label htmlFor="overallAssessment">Overall Assessment</Label>
              <Textarea
                id="overallAssessment"
                name="overallAssessment"
                placeholder="Describe your observations of the terminal/depot premises, fleet condition, and any issues found…"
                rows={6}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recommendedAction">
                Recommendation <span className="text-destructive">*</span>
              </Label>
              <Select name="recommendedAction" required>
                <SelectTrigger id="recommendedAction">
                  <SelectValue placeholder="Select recommendation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">
                    ✅ Approve — meets all requirements
                  </SelectItem>
                  <SelectItem value="CONDITIONAL">
                    ⚠️ Conditional — approve with conditions
                  </SelectItem>
                  <SelectItem value="REJECT">
                    ❌ Reject — does not meet requirements
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                APPROVE or CONDITIONAL advances to Inspection Completed. REJECT
                moves to Rejected.
              </p>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Submitting…" : "Submit Report"}
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
