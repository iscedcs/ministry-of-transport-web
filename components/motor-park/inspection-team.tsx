"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commentOnMotorParkInspection } from "@/app/actions/motor-park";

interface TeamMember {
  userId: string;
  isLead: boolean;
  comment: string | null;
  user: { firstName: string; lastName: string };
}

/**
 * Who is on the inspection team, and what each of them saw — the same
 * pattern as the mass transit terminal panel. The lead files the checklist;
 * everyone else leaves a comment the HOD reads before recommending.
 */
export function MotorParkInspectionTeam({
  parkId,
  team,
  currentUserId,
}: {
  parkId: string;
  team: TeamMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");

  if (team.length === 0) return null;

  const self = team.find((m) => m.userId === currentUserId);
  const canComment = !!self && !self.isLead;

  const submit = () => {
    if (!comment.trim()) return;
    startTransition(async () => {
      const res = await commentOnMotorParkInspection(parkId, comment);
      if (res.success) {
        toast.success("Comment saved.");
        setComment("");
        router.refresh();
      } else {
        toast.error(res.error || "Could not save your comment.");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Inspection Team ({team.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {team.map((m) => (
          <div key={m.userId} className="rounded-lg border border-border px-3 py-2">
            <p className="text-sm font-medium">
              {m.user.firstName} {m.user.lastName}
              {m.isLead && (
                <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  Lead
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {m.comment ?? (m.isLead ? "Files the checklist and findings." : "No comment yet.")}
            </p>
          </div>
        ))}

        {canComment && (
          <div className="flex flex-col gap-2 border-t pt-3">
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you observe on site?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={isPending || !comment.trim()}
              onClick={submit}
              className="w-fit rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {isPending ? "Saving..." : "Save comment"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
