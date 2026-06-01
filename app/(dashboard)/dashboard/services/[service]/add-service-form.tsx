"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { addApplicantService } from "@/app/actions/auth";
import { SERVICE_LABELS } from "@/lib/service-config";
import type { ActionResult } from "@/lib/server-actions-pattern";

export function AddServiceForm({
  serviceKey,
}: {
  serviceKey: keyof typeof SERVICE_LABELS;
}) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  const [state, action, isPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(
    addApplicantService as (
      s: ActionResult | undefined,
      f: FormData,
    ) => Promise<ActionResult>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <>
      <div className="flex items-start gap-3 rounded-lg border border-border p-4 bg-background">
        <Checkbox
          id="agree"
          checked={agreed}
          onCheckedChange={(value) => setAgreed(!!value)}
          className="mt-0.5"
        />
        <Label
          htmlFor="agree"
          className="text-sm leading-relaxed cursor-pointer">
          I have read and understand all the requirements and terms above. I
          confirm my eligibility to add this service to my account.
        </Label>
      </div>

      <form action={action} noValidate>
        <input type="hidden" name="service" value={serviceKey} />
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="submit"
            disabled={!agreed || isPending}
            className="flex-1 sm:flex-none sm:min-w-[200px]">
            {isPending ? "Adding…" : "Add Service"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/services">Cancel</Link>
          </Button>
        </div>
      </form>

      {state && !state.success && (
        <div className="rounded-lg border border-destructive/70 bg-destructive/10 p-4 text-sm text-destructive">
          {state.error ?? "Unable to add this service."}
        </div>
      )}
    </>
  );
}
