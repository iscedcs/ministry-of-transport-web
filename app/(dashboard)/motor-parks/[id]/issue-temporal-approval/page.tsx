"use client";

import { useActionState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { issueTemporalApproval } from "@/app/actions/motor-park";
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

type TemporalApprovalState =
  | ActionResult<{ parkId: string }>
  | undefined;

export default function IssueTemporalApprovalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [state, action, isPending] = useActionState<
    TemporalApprovalState,
    FormData
  >(
    issueTemporalApproval as (
      s: TemporalApprovalState,
      f: FormData,
    ) => Promise<TemporalApprovalState>,
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
          <span className="text-foreground">Issue Temporary Approval</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Issue Temporary Approval
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Issue a temporary approval allowing operations to commence temporarily while waiting for final approval.
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
          all required criteria for temporary operations are met.
        </p>
        <p className="text-xs text-muted-foreground">
          The application will be set to{" "}
          <strong className="text-foreground">TEMPORAL_APPROVAL</strong> status.
        </p>
      </div>

      <form action={action} noValidate>
        <input type="hidden" name="parkId" value={parkId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Notes</CardTitle>
            <CardDescription>
              Add any terms, conditions, or operational limits for this temporary approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">
                Conditions / Notes{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="e.g. Valid for 3 months pending final review."
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
            {isPending ? "Issuing…" : "Issue Temporary Approval"}
          </Button>
        </div>
      </form>
    </div>
  );
}
