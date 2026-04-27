"use client";

/**
 * Request Re-Inspection Page — Ministry of Transport Platform
 * STORY-027 | FR-014
 *
 * External applicant notifies the Ministry that construction is complete
 * and requests a re-inspection of the motor park site.
 * Resets application status to SUBMITTED so HOD Parks can schedule
 * the re-inspection.
 *
 * Access: EXTERNAL_APPLICANT (own parks only)
 */

import { useActionState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { requestReInspection } from "@/app/actions/motor-park";
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

type ReInspectState = ActionResult | undefined;

export default function RequestReInspectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [state, action, isPending] = useActionState<ReInspectState, FormData>(
    requestReInspection as (
      s: ReInspectState,
      f: FormData,
    ) => Promise<ReInspectState>,
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
          <span className="text-foreground">Request Re-Inspection</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Notify Construction Complete
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-014 — Notify the Ministry that your motor park construction is
          complete and request a re-inspection.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-border/50 bg-secondary/50 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">What happens next:</strong> After
          you submit this notification, the Parks Inspection Team will schedule
          a re-inspection of your completed motor park site. Ensure the site
          fully meets all required standards before submitting — including{" "}
          <strong>parking arrangement</strong>, <strong>fencing</strong>,
          <strong> conveniences</strong>, <strong>fire extinguishers</strong>,
          and all other FR-012 criteria.
        </p>
      </div>

      <form action={action} noValidate>
        <input type="hidden" name="parkId" value={parkId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion Details</CardTitle>
            <CardDescription>
              Describe the completed works and any relevant notes for the
              inspection team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="completionNotes">
                Completion Notes{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="completionNotes"
                name="completionNotes"
                placeholder="e.g. All construction works completed as per Permit to Build specifications. Fire extinguishers installed. Perimeter fencing complete…"
                rows={5}
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
            {isPending ? "Submitting…" : "Notify Construction Complete"}
          </Button>
        </div>
      </form>
    </div>
  );
}
