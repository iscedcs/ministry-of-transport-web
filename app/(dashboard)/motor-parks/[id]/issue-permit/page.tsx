"use client";

/**
 * Issue Permit to Build — Ministry of Transport Platform
 * STORY-026 | FR-013
 *
 * Commissioner or Permanent Secretary issues the Permit to Build
 * after the initial inspection is completed and approved.
 * Moves application status to APPROVED with an active permit.
 *
 * Access: COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { issuePermitToBuild } from "@/app/actions/motor-park";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type IssueState = ActionResult<{ permitNumber: string }> | undefined;

export default function IssuePermitToBuildPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [state, action, isPending] = useActionState<IssueState, FormData>(
    issuePermitToBuild as (s: IssueState, f: FormData) => Promise<IssueState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/motor-parks/${parkId}`);
    }
  }, [state, parkId, router]);

  const err = state && !state.success ? state.error : undefined;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
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
          <span className="text-foreground">Issue Permit to Build</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Issue Permit to Build
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-013 — Confirm the initial inspection result and issue the official
          Permit to Build to the applicant.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-border/50 bg-secondary/50 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Before proceeding:</strong> Ensure
          the initial site inspection report has been submitted with an{" "}
          <strong>APPROVE</strong> or <strong>CONDITIONAL</strong>{" "}
          recommendation. The permit number will be auto-generated in the format{" "}
          <code className="bg-border/50 rounded px-1 text-xs">
            MOT/PTB/YYYY/NNNN
          </code>
          .
        </p>
      </div>

      <form action={action} noValidate>
        <input type="hidden" name="parkId" value={parkId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Details</CardTitle>
            <CardDescription>
              Provide any conditions or notes to accompany the permit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="approvalNotes">
                Conditions / Notes{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="approvalNotes"
                name="approvalNotes"
                placeholder="e.g. Applicant must install a minimum of 2 × 9 kg DCP fire extinguishers before construction commences…"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href={`/motor-parks/${parkId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Issuing…" : "Issue Permit to Build"}
          </Button>
        </div>
      </form>
    </div>
  );
}
