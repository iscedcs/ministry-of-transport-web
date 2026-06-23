"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { reviewParkMonitorApplication, issueParkMonitorId } from "@/app/actions/park-monitor";
import { toast } from "sonner";

export function ReviewActions({ 
  applicationId, 
  canReview, 
  canIssueId, 
  isExecutive 
}: { 
  applicationId: string, 
  canReview: boolean, 
  canIssueId: boolean,
  isExecutive: boolean
}) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | "WAITLISTED" | "ISSUE" | null>(null);

  const handleReview = (status: "APPROVED" | "REJECTED" | "WAITLISTED") => {
    if ((status === "REJECTED" || status === "WAITLISTED") && !notes.trim()) {
      toast.error("Please provide a reason for this action.");
      return;
    }
    
    setActionType(status);
    startTransition(async () => {
      const res = await reviewParkMonitorApplication(applicationId, status, notes);
      if (res.success) {
        toast.success(`Application ${status.toLowerCase()} successfully.`);
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
        toast.success("ID Card issued successfully. Applicant is now a Park Monitor.");
      } else {
        toast.error(res.error || "Failed to issue ID card");
      }
      setActionType(null);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isExecutive ? "Review Application" : "Issue ID Card"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canReview && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes / Reason (Required for Reject/Waitlist)</label>
              <Textarea 
                placeholder="Enter any notes..." 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                disabled={isPending}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => handleReview("APPROVED")} 
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isPending && actionType === "APPROVED" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Approve Application
              </Button>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleReview("WAITLISTED")} 
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  {isPending && actionType === "WAITLISTED" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Waitlist
                </Button>
                <Button 
                  onClick={() => handleReview("REJECTED")} 
                  disabled={isPending}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                >
                  {isPending && actionType === "REJECTED" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Reject
                </Button>
              </div>
            </div>
          </>
        )}

        {canIssueId && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">The applicant has completed the ID fee payment. Click below to issue their ID Card and assign the Park Monitor role.</p>
            <Button 
              onClick={handleIssueId} 
              disabled={isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending && actionType === "ISSUE" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Generate & Issue ID Card
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
