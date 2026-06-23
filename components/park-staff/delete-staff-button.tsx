"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteParkStaff } from "@/app/actions/park-staff";

export function DeleteStaffButton({ staffId, parkId }: { staffId: string, parkId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this staff member? This cannot be undone.")) {
      startTransition(async () => {
        const res = await deleteParkStaff(staffId, parkId);
        if (!res.success) {
          alert(res.error);
        }
      });
    }
  };

  return (
    <Button 
      variant="destructive" 
      size="icon" 
      onClick={handleDelete}
      disabled={isPending}
      title="Delete Staff Member"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </Button>
  );
}
