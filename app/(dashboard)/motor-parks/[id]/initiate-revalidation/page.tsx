"use client";

/**
 * Initiate Revalidation Page — Ministry of Transport Platform
 * STORY-031 | FR-018
 *
 * HOD Parks or Commissioner initiates the annual revalidation cycle for
 * an active motor park permit. This resets the application status to
 * SUBMITTED, triggering a fresh inspection round.
 *
 * Revalidation should be initiated when the permit is approaching its
 * annual expiry date (nextRevalidationDue).
 *
 * Access: HOD_PARKS, COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { triggerRevalidation } from "@/app/actions/motor-park";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type RevalidateState = ActionResult | undefined;

export default function InitiateRevalidationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [state, action, isPending] = useActionState<RevalidateState, FormData>(
    triggerRevalidation as (
      s: RevalidateState,
      f: FormData,
    ) => Promise<RevalidateState>,
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
          <span className="text-foreground">Initiate Revalidation</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Initiate Annual Revalidation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-018 — Trigger the annual revalidation cycle for this motor park
          permit.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What Happens Next</CardTitle>
          <CardDescription>
            Initiating revalidation starts a fresh inspection workflow for this
            motor park.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>
              Application status resets to{" "}
              <strong className="text-foreground">SUBMITTED</strong> — the
              permit remains ACTIVE during re-inspection.
            </li>
            <li>
              HOD Parks schedules a{" "}
              <strong className="text-foreground">
                Revalidation Inspection
              </strong>{" "}
              for the site.
            </li>
            <li>
              The field inspector completes the{" "}
              <strong className="text-foreground">
                physical standards checklist
              </strong>{" "}
              and records the proximity evaluation.
            </li>
            <li>
              Commissioner / PS issues a renewed{" "}
              <strong className="text-foreground">Final Approval Letter</strong>{" "}
              extending the permit by one year.
            </li>
          </ol>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-4">
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">
          Before initiating
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Confirm the operator has been notified of the upcoming revalidation
          deadline. Revalidation should be initiated at least{" "}
          <strong className="text-foreground">30 days</strong> before the permit
          expiry date to allow sufficient time for re-inspection.
        </p>
      </div>

      <form action={action} noValidate>
        <input type="hidden" name="parkId" value={parkId} />

        <Separator className="mb-6" />

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href={`/motor-parks/${parkId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Initiating…" : "Initiate Revalidation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
