"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  reviewParkMonitorApplication,
  issueParkMonitorId,
} from "@/app/actions/park-monitor";
import { toast } from "sonner";

export function ReviewActions({
  applicationId,
  canReview,
  canIssueId,
  hasPhoto,
}: {
  applicationId: string;
  canReview: boolean;
  /** Approved under the old flow and never issued a card. */
  canIssueId: boolean;
  hasPhoto: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState<
    "APPROVED" | "REJECTED" | "WAITLISTED" | "ISSUE" | null
  >(null);

  const handleReview = (status: "APPROVED" | "REJECTED" | "WAITLISTED") => {
    if (status === "APPROVED" && !hasPhoto) {
      toast.error(
        "Add the applicant's passport photograph first — the ID card is printed with it.",
      );
      return;
    }
    if ((status === "REJECTED" || status === "WAITLISTED") && !notes.trim()) {
      toast.error("Please provide a reason for this action.");
      return;
    }

    setActionType(status);
    startTransition(async () => {
      const res = await reviewParkMonitorApplication(applicationId, status, notes);
      if (res.success) {
        toast.success(
          status === "APPROVED"
            ? "Application approved. The ID card has been generated."
            : `Application ${status.toLowerCase()} successfully.`,
        );
        setNotes("");
      } else {
        toast.error(res.error || "Failed to review application");
      }
      setActionType(null);
    });
  };

  const handleIssueId = () => {
    setActionType("ISSUE");
    startTransition(async () => {
      const res = await issueParkMonitorId(applicationId);
      if (res.success) {
        toast.success("ID card issued.");
      } else {
        toast.error(res.error || "Failed to issue ID card");
      }
      setActionType(null);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{canReview ? "Review Application" : "Issue ID Card"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canReview && (
          <>
            {!hasPhoto && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                No passport photograph yet. Add one in the Passport Photograph
                box before approving.
              </p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notes / Reason (Required for Reject/Waitlist)
              </label>
              <Textarea
                placeholder="Enter any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleReview("APPROVED")}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700 text-white">
                {isPending && actionType === "APPROVED" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Approve &amp; Generate ID Card
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleReview("WAITLISTED")}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50">
                  {isPending && actionType === "WAITLISTED" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Waitlist
                </Button>
                <Button
                  onClick={() => handleReview("REJECTED")}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-600 hover:bg-red-50">
                  {isPending && actionType === "REJECTED" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Reject
                </Button>
              </div>
            </div>
          </>
        )}

        {canIssueId && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              This application was approved before ID cards were generated
              automatically. Click below to generate the ID card now.
            </p>
            <Button
              onClick={handleIssueId}
              disabled={isPending || !hasPhoto}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {isPending && actionType === "ISSUE" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Generate ID Card
            </Button>
            {!hasPhoto && (
              <p className="text-xs text-amber-700">
                Add the passport photograph first.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
