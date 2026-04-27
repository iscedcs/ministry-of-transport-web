"use client";

/**
 * Fee Assessment Page — Ministry of Transport Platform
 * STORY-029 | FR-016
 *
 * Finance Officer (or Commissioner/PS) records a motor park fee or levy.
 * Amount is entered in naira (₦) and converted to kobo before submission.
 *
 * Access: FINANCE_OFFICER, COMMISSIONER, PERMANENT_SECRETARY
 */

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { recordFeeAssessment } from "@/app/actions/motor-park";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type FeeState = ActionResult<{ feeId: string }> | undefined;

const FEE_TYPES = [
  { value: "APPLICATION", label: "Application Fee" },
  { value: "MONTHLY_LEVY", label: "Monthly Levy" },
  { value: "ANNUAL", label: "Annual Fee" },
  { value: "REVALIDATION", label: "Revalidation Fee" },
] as const;

export default function AssessFeesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const parkId = params.id;

  /** Naira display value (what the user types) */
  const [nairaValue, setNairaValue] = useState("");

  /** Kobo value submitted to the server (naira × 100) */
  const koboValue = nairaValue
    ? String(Math.round(parseFloat(nairaValue) * 100))
    : "";

  const [state, action, isPending] = useActionState<FeeState, FormData>(
    recordFeeAssessment as (s: FeeState, f: FormData) => Promise<FeeState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/motor-parks/${parkId}`);
    }
  }, [state, parkId, router]);

  const err = state && !state.success ? state.error : undefined;

  // Minimum due date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDue = tomorrow.toISOString().split("T")[0];

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
          <span className="text-foreground">Assess Fee</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Record Fee / Levy
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-016 — Assess and record a motor park fee or levy obligation.
        </p>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <form action={action} noValidate>
        {/* motorParkId hidden — used by server action */}
        <input type="hidden" name="motorParkId" value={parkId} />
        {/* amount in kobo — derived from naira input */}
        <input type="hidden" name="amount" value={koboValue} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fee Details</CardTitle>
            <CardDescription>
              Enter the fee type, amount (₦), and the payment due date.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Fee Type */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feeType">Fee Type</Label>
              <Select name="feeType" required>
                <SelectTrigger id="feeType">
                  <SelectValue placeholder="Select fee type…" />
                </SelectTrigger>
                <SelectContent>
                  {FEE_TYPES.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount (naira) */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nairaAmount">Amount (₦)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                  ₦
                </span>
                <Input
                  id="nairaAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={nairaValue}
                  onChange={(e) => setNairaValue(e.target.value)}
                  required
                />
              </div>
              {nairaValue && !isNaN(parseFloat(nairaValue)) && (
                <p className="text-xs text-muted-foreground">
                  = ₦
                  {parseFloat(nairaValue).toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Payment Due Date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                min={minDue}
                required
              />
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
            disabled={isPending || !nairaValue || !koboValue}
            aria-busy={isPending}>
            {isPending ? "Recording…" : "Record Fee Assessment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
