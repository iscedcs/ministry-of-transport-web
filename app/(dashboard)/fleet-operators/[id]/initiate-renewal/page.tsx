"use client";

/**
 * Initiate Annual Renewal — Ministry of Transport Platform
 * STORY-050 | FR-027 (annual renewal workflow)
 *
 * HOD Parks / Commissioner initiates the annual permit renewal process.
 * Resets applicationStatus → SUBMITTED and records lastRevalidatedAt.
 *
 * Access: HOD_PARKS, HOD_PARKS_REVALIDATION, COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { initiateAnnualRenewal } from "@/app/actions/mass-transit";
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

type RenewalState = ActionResult | undefined;

export default function InitiateRenewalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const [state, action, isPending] = useActionState<RenewalState, FormData>(
    initiateAnnualRenewal as (
      s: RenewalState,
      f: FormData,
    ) => Promise<RenewalState>,
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
          <span>Initiate Annual Renewal</span>
        </nav>
        <h1 className="text-2xl font-semibold">Initiate Annual Renewal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-027: Start the annual permit renewal workflow. The application
          status will be reset to <strong>Submitted</strong> and a new
          inspection cycle will begin.
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-sm">
          <p>Initiating renewal will:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted-foreground">
            <li>Reset application status to &ldquo;Submitted&rdquo;</li>
            <li>Record the current date as last revalidated</li>
            <li>Trigger a new terminal inspection cycle</li>
          </ul>
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
            <CardTitle className="text-base">Confirm Renewal</CardTitle>
            <CardDescription>
              Optionally provide renewal context or notes
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <input type="hidden" name="companyId" value={companyId} />

            <div className="space-y-1.5">
              <Label htmlFor="renewalNotes">Renewal Notes (optional)</Label>
              <Textarea
                id="renewalNotes"
                name="renewalNotes"
                placeholder="e.g. Annual renewal as per schedule, permit expires in 30 days…"
                rows={3}
              />
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Processing…" : "Initiate Annual Renewal"}
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
