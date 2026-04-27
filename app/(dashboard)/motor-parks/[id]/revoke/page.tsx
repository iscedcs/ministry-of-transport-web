"use client";

/**
 * Revoke Permit Page — Ministry of Transport Platform
 * STORY-032 | FR-019
 *
 * Commissioner or Permanent Secretary revokes an active motor park permit
 * for non-compliance. Requires a written reason (min 10 characters).
 * Sets application status to REVOKED and permit status to REVOKED.
 *
 * Access: COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { revokeParkPermit } from "@/app/actions/motor-park";
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

type RevokeState = ActionResult | undefined;

export default function RevokeParkPermitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  const [state, action, isPending] = useActionState<RevokeState, FormData>(
    revokeParkPermit as (s: RevokeState, f: FormData) => Promise<RevokeState>,
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
          <span className="text-foreground">Revoke Permit</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Revoke Motor Park Permit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-019 — Permanently revoke this motor park permit due to
          non-compliance.
        </p>
      </div>

      {/* Destructive warning */}
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <p className="text-xs font-medium text-destructive mb-1">
          ⚠ This action cannot be undone
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Revoking this permit will immediately set the application status to{" "}
          <strong>REVOKED</strong> and the permit status to{" "}
          <strong>REVOKED</strong>. The operator will lose authorisation to run
          this motor park. A complete audit record will be created.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <form action={action} noValidate>
        <input type="hidden" name="parkId" value={parkId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revocation Reason</CardTitle>
            <CardDescription>
              Document the specific grounds for revocation. This will be
              recorded in the audit trail and sent to the operator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="revocationReason">
                Reason for Revocation{" "}
                <span className="text-destructive text-xs">*</span>
              </Label>
              <Textarea
                id="revocationReason"
                name="revocationReason"
                placeholder="e.g. Repeated failure to maintain required safety standards following two enforcement notices dated [dates]. Non-compliance with FR-012 criteria items 3, 7, and 11. Operator failed to rectify deficiencies within the stipulated 30-day notice period…"
                rows={6}
                minLength={10}
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters required.
              </p>
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
            variant="destructive"
            disabled={isPending}
            aria-busy={isPending}>
            {isPending ? "Revoking…" : "Revoke Permit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
