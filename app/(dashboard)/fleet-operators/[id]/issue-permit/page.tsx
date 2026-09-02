"use client";

/**
 * Issue Permit to Operate — Ministry of Transport Platform
 * STORY-049 | FR-027
 *
 * Commissioner / PS issues the Permit to Operate.
 * Number format: MOT/PTO/YYYY/NNNN
 * Validity: 1 year from issue date.
 *
 * Access: COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { issuePermitToOperate } from "@/app/actions/mass-transit";
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

type PermitState = ActionResult | undefined;

export default function IssuePermitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const [state, action, isPending] = useActionState<PermitState, FormData>(
    issuePermitToOperate as (
      s: PermitState,
      f: FormData,
    ) => Promise<PermitState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/fleet-operators/${companyId}`);
    }
  }, [state, companyId, router]);

  const err = state && !state.success ? state.error : undefined;

  const expiryPreview = new Date();
  expiryPreview.setFullYear(expiryPreview.getFullYear() + 1);

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
          <span>Issue Permit</span>
        </nav>
        <h1 className="text-2xl font-semibold">Issue Permit to Operate</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grant either a temporary or a full approval. The choice determines the
          permit number, how long it runs, and the wording on the approval
          letter and every terminal certificate.
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-sm">
          <p>
            The permit number is assigned automatically —{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              ANS-MOT-MTC-YYYY/NNNNN
            </code>{" "}
            for a full approval,{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              ANS-MOT-MTT
            </code>{" "}
            for a temporary one, so the two are never confused on paper.
          </p>
          <p className="mt-1">
            Validity periods are set in System Configuration under Certificate
            Validity.
          </p>
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
            <CardTitle className="text-base">Issue Permit</CardTitle>
            <CardDescription>
              Confirm and optionally add approval notes
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <input type="hidden" name="companyId" value={companyId} />

            <div className="space-y-1.5">
              <Label htmlFor="approvalNotes">Approval Notes (optional)</Label>
              <Textarea
                id="approvalNotes"
                name="approvalNotes"
                placeholder="Any special conditions or notes attached to this permit…"
                rows={4}
              />
            </div>

            <Separator />

            {/* Two distinct decisions, each stated plainly — the same choice
                the Commissioner makes on a park revalidation. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="submit"
                name="approvalType"
                value="PERMANENT"
                disabled={isPending}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 text-left transition-colors hover:bg-emerald-500/10 disabled:opacity-50">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Full approval
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  All requirements met. Numbered ANS-MOT-MTC.
                </p>
              </button>

              <button
                type="submit"
                name="approvalType"
                value="TEMPORAL"
                disabled={isPending}
                className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-left transition-colors hover:bg-amber-500/10 disabled:opacity-50">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Temporary approval
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Permission to operate while outstanding requirements are met.
                  Numbered ANS-MOT-MTT.
                </p>
              </button>
            </div>

            <div className="flex gap-3">
              <Button asChild variant="outline" disabled={isPending}>
                <Link href={`/fleet-operators/${companyId}`}>Cancel</Link>
              </Button>
              {isPending && (
                <span className="self-center text-sm text-muted-foreground">
                  Issuing…
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
