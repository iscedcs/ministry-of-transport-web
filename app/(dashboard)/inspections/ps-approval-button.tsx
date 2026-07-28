"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveScheduledInspection, rejectScheduledInspection } from "@/app/actions/inspections";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface PsApprovalButtonProps {
  inspectionId: string;
}

export default function PsApprovalButton({ inspectionId }: PsApprovalButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await approveScheduledInspection(inspectionId);
      if (res.success) {
        toast.success("Inspection schedule approved by Permanent Secretary!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to approve inspection.");
      }
    } catch (err) {
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    const reason = window.prompt("Enter rejection reason for Permanent Secretary oversight:");
    if (reason === null) return; // User cancelled prompt

    setLoading(true);
    try {
      const res = await rejectScheduledInspection(inspectionId, reason);
      if (res.success) {
        toast.success("Inspection schedule rejected.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reject inspection.");
      }
    } catch (err) {
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end space-x-1">
      <Button
        size="sm"
        disabled={loading}
        onClick={handleApprove}
        className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2.5"
      >
        <Check className="w-3.5 h-3.5 mr-1" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={handleReject}
        className="text-xs h-7 px-2 border-red-200 text-red-700 hover:bg-red-50"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
