"use client";

/**
 * Issue Final Approval Page — Ministry of Transport Platform
 * STORY-030 | FR-017
 *
 * Commissioner or Permanent Secretary issues the final approval letter
 * after a successful re-inspection. Generates a permit number, sets
 * permit status to ACTIVE, and records the annual revalidation due date.
 *
 * Access: COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { issueFinalApproval } from "@/app/actions/motor-park";
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

type FinalApprovalState =
  | ActionResult<{ permitNumber: string; revalidationDue: Date }>
  | undefined;

export default function IssueFinalApprovalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [state, action, isPending] = useActionState<
    FinalApprovalState,
    FormData
  >(
    issueFinalApproval as (
      s: FinalApprovalState,
      f: FormData,
    ) => Promise<FinalApprovalState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/motor-parks/${parkId}`);
    }
  }, [state, parkId, router]);

  const err = state && !state.success ? state.error : undefined;

  // Calculate what the revalidation date will be
  const revalidationYear = new Date().getFullYear() + 1;

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
          <span className="text-foreground">Issue Final Approval</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Issue Final Approval Letter
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-017 — Issue the digital approval letter with terms, conditions, and
          the annual revalidation requirement.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-border/50 bg-secondary/50 p-4 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Before proceeding:</strong> Ensure
          the re-inspection report confirms all FR-012 standards are met and the
          proximity evaluation (FR-015) has been completed.
        </p>
        <p className="text-xs text-muted-foreground">
          The permit will be set to{" "}
          <strong className="text-foreground">ACTIVE</strong> with an annual
          revalidation due date of{" "}
          <strong className="text-foreground">
            April 26, {revalidationYear}
          </strong>
          .
        </p>
      </div>

      <form action={action} noValidate>
        <input type="hidden" name="parkId" value={parkId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Letter Details</CardTitle>
            <CardDescription>
              Add any terms, conditions, or operational requirements to
              accompany the approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="approvalNotes">
                Terms & Conditions / Notes{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="approvalNotes"
                name="approvalNotes"
                placeholder="e.g. The operator must maintain all required safety equipment at all times. The park must remain accessible during inspection visits by Ministry officers. Annual revalidation is mandatory…"
                rows={6}
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
            {isPending ? "Issuing…" : "Issue Final Approval"}
          </Button>
        </div>
      </form>
    </div>
  );
}
