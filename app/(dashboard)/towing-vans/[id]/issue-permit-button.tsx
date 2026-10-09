"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { issueTowingPermit } from "@/app/actions/towing";

export default function IssuePermitButton({ towingVanId }: { towingVanId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const issue = () => {
    startTransition(async () => {
      const res = await issueTowingPermit(towingVanId);
      if (res.success) {
        toast.success(`Permit ${res.permitNumber} issued.`);
        router.refresh();
      } else {
        toast.error(res.error || "Could not issue the permit.");
      }
    });
  };

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-emerald-900 dark:text-emerald-200">
          Issue the Anambra State Towing Permit
        </CardTitle>
        <CardDescription>
          Generates the permit number and carries the Commissioner&apos;s signature.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={issue}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
          {isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4 mr-2" />
          )}
          Issue Permit
        </Button>
      </CardContent>
    </Card>
  );
}
