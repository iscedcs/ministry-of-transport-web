"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Bus, AlertTriangle, Check } from "lucide-react";
import {
  classifyRevalidationApplication,
  routeRevalidationApplication,
  type ServiceCategory,
  type TriageRoute,
} from "@/app/actions/revalidation-triage";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Sorting an imported record before it goes any further.
 *
 * Two questions the vendor's data cannot answer: what kind of operator is
 * this, and do they already hold an approval. Both are decided here, and the
 * second one takes a written basis because nothing else will ever evidence it.
 */
export function TriagePanel({
  applicationId,
  serviceCategory,
  triageRoute,
  existingApprovalNum,
  triageBasis,
  triagedBy,
  triagedAt,
  suggestion,
  canRoute,
}: {
  applicationId: string;
  serviceCategory: string | null;
  triageRoute: string | null;
  existingApprovalNum: string | null;
  triageBasis: string | null;
  triagedBy: string | null;
  triagedAt: Date | null;
  /** Why the record looks like mass transit, if it does. */
  suggestion: string | null;
  canRoute: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [basis, setBasis] = useState(triageBasis ?? "");
  const [approvalNumber, setApprovalNumber] = useState(existingApprovalNum ?? "");

  const classify = (category: ServiceCategory) =>
    startTransition(async () => {
      setError(null);
      const res = await classifyRevalidationApplication(applicationId, category);
      if (!res.success) setError(res.error ?? "Could not classify.");
      else router.refresh();
    });

  const route = (decision: TriageRoute) =>
    startTransition(async () => {
      setError(null);
      const res = await routeRevalidationApplication(applicationId, decision, {
        basis,
        approvalNumber: approvalNumber || undefined,
      });
      if (!res.success) setError(res.error ?? "Could not record the decision.");
      else router.refresh();
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5">
        <div>
          <h3 className="text-sm font-semibold">Triage</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Imported from the previous vendor. Their export carried no operator
            category and no approval field, so both are decided here.
          </p>
        </div>

        {/* ── What kind of operator ───────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operator type
          </p>

          {suggestion && !serviceCategory && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Looks like mass transit — {suggestion}. Confirm before filing.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => classify("MOTOR_PARK")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
                serviceCategory === "MOTOR_PARK"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-secondary",
              )}>
              <Building2 className="h-4 w-4" />
              Motor park
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => classify("MASS_TRANSIT")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
                serviceCategory === "MASS_TRANSIT"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-secondary",
              )}>
              <Bus className="h-4 w-4" />
              Mass transit
            </button>
          </div>

          {serviceCategory === "MASS_TRANSIT" && (
            <p className="text-xs text-muted-foreground">
              On approval this becomes a mass transit company with a terminal,
              and the terminal becomes a park — so it still gets park staff,
              inspections and a certificate.
            </p>
          )}
        </div>

        {/* ── Revalidate, or start afresh ─────────────────────────────────── */}
        <div className="flex flex-col gap-2 border-t pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Holds an existing approval?
          </p>

          {!canRoute ? (
            <p className="text-xs text-muted-foreground">
              Only the HOD of Operations records this decision.
            </p>
          ) : (
            <>
              <input
                value={approvalNumber}
                onChange={(e) => setApprovalNumber(e.target.value)}
                placeholder="Approval number, if there is one"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <textarea
                value={basis}
                onChange={(e) => setBasis(e.target.value)}
                rows={2}
                placeholder="On what basis? e.g. 2019 approval on file, or no record found"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => route("REVALIDATION")}
                  className="rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
                  Yes — revalidate
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => route("NEW_APPLICATION")}
                  className="rounded-lg border border-amber-500 px-3 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-400">
                  No — fresh application
                </button>
              </div>

              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                A fresh application still runs here — inspection, then the
                approval chain. What changes is what the operator must
                produce: the documents and site evidence a first-time
                applicant provides, which the Ministry has not waived.
              </p>
            </>
          )}

          {triageRoute && (
            <p className="flex items-start gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
              <span>
                Recorded as{" "}
                <strong>
                  {triageRoute === "REVALIDATION"
                    ? "revalidation"
                    : "fresh application"}
                </strong>
                {triagedBy ? ` by ${triagedBy}` : ""}
                {triagedAt ? ` on ${triagedAt.toDateString()}` : ""}.
              </span>
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
