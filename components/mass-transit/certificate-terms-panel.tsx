"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setFleetCertificateTerms } from "@/app/actions/mass-transit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Certificate terms for the mass transit approval letter.
 *
 * The same fields the revalidation letter uses: monthly operational fee, the
 * previous fee if it was reviewed, when the approval takes effect, and any
 * facilities the operator must provide within six months. Set them before the
 * Commissioner signs, or the letter prints with blanks.
 */
export function FleetCertificateTermsPanel({
  companyId,
  initial,
}: {
  companyId: string;
  initial: {
    monthlyFeeAmount: number | null;
    previousMonthlyFeeAmount: number | null;
    effectiveFrom: Date | null;
    requiredFacilities: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const koboToNaira = (v: number | null) =>
    v === null || v === undefined ? "" : Math.round(v / 100).toString();

  const [monthlyFee, setMonthlyFee] = useState(koboToNaira(initial.monthlyFeeAmount));
  const [previousFee, setPreviousFee] = useState(koboToNaira(initial.previousMonthlyFeeAmount));
  const [effectiveFrom, setEffectiveFrom] = useState(
    initial.effectiveFrom ? initial.effectiveFrom.toISOString().slice(0, 10) : "",
  );
  const [requiredFacilities, setRequiredFacilities] = useState(
    initial.requiredFacilities ?? "",
  );

  const save = () =>
    startTransition(async () => {
      const res = await setFleetCertificateTerms(companyId, {
        monthlyFeeNaira: monthlyFee,
        previousMonthlyFeeNaira: previousFee,
        effectiveFrom: effectiveFrom || null,
        requiredFacilities,
      });
      if (res.success) {
        toast.success("Certificate terms saved.");
        router.refresh();
      } else {
        toast.error(res.error || "Could not save the terms.");
      }
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Certificate Terms</CardTitle>
        <CardDescription>
          These appear on the approval letter. Set them before the Commissioner
          approves, or the letter prints with blanks.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="monthlyFee">Monthly operational fee (₦)</Label>
          <Input
            id="monthlyFee"
            type="number"
            min={0}
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
            placeholder="e.g. 15000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="previousFee">
            Previous fee (₦) — only if reviewed
          </Label>
          <Input
            id="previousFee"
            type="number"
            min={0}
            value={previousFee}
            onChange={(e) => setPreviousFee(e.target.value)}
            placeholder="Leave blank if this is the first fee"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="effectiveFrom">With effect from</Label>
          <Input
            id="effectiveFrom"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requiredFacilities">
            Facilities required within 6 months
          </Label>
          <Input
            id="requiredFacilities"
            value={requiredFacilities}
            onChange={(e) => setRequiredFacilities(e.target.value)}
            placeholder="e.g. Fire extinguishers, CCTV"
          />
        </div>
        <div className="sm:col-span-2">
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save terms"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
