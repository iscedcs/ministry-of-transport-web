"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BellRing, Loader2, Users, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  broadcastAlert,
  getBroadcastAudienceCount,
  type BroadcastAudience,
} from "@/app/actions/broadcast";
import { ROLE_LABELS } from "@/lib/utils/labels";

const AUDIENCES: { value: BroadcastAudience; label: string; hint: string }[] = [
  { value: "ALL_STAFF", label: "All Ministry staff", hint: "Every active staff account" },
  { value: "ROLE", label: "A specific role", hint: "Only holders of one role" },
  { value: "ALL_APPLICANTS", label: "All applicants", hint: "Park owners and operators" },
  { value: "EVERYONE", label: "Everyone", hint: "Staff and applicants together" },
];

const ROLES = Object.keys(ROLE_LABELS).filter((r) => r !== "EXTERNAL_APPLICANT");

export function BroadcastDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [audience, setAudience] = useState<BroadcastAudience>("ALL_STAFF");
  const [role, setRole] = useState("SYSTEM_ADMIN");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [count, setCount] = useState<{ count: number; withEmail: number } | null>(null);

  /** Resolve the audience so the sender sees who this reaches before sending. */
  function refreshCount(next: BroadcastAudience, nextRole: string) {
    startTransition(async () => {
      const res = await getBroadcastAudienceCount(next, nextRole);
      setCount(res.success ? { count: res.count, withEmail: res.withEmail } : null);
    });
  }

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (v) refreshCount(audience, role);
  }

  function send() {
    if (!subject.trim()) return toast.error("Enter a subject");
    if (!message.trim()) return toast.error("Enter a message");
    if (
      !confirm(
        `Send "${subject.trim()}" to ${count?.count ?? "these"} recipient(s)? This cannot be recalled.`,
      )
    )
      return;

    startTransition(async () => {
      const res = await broadcastAlert({ audience, role, subject, message, sendEmail });
      if (res.success) {
        const d = res.data!;
        toast.success(
          `Sent to ${d.recipients} recipient(s)` +
            (sendEmail
              ? ` — ${d.emailed} emailed${d.emailFailed ? `, ${d.emailFailed} failed` : ""}${d.emailSkipped ? `, ${d.emailSkipped} without an address` : ""}`
              : ""),
        );
        setSubject("");
        setMessage("");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Broadcast failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <BellRing className="w-4 h-4" />
          Broadcast Alert
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" />
            Broadcast Alert
          </DialogTitle>
          <DialogDescription>
            Records a notice against every recipient&apos;s account, and emails
            those with an address on file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="audience">Audience</Label>
            <select
              id="audience"
              value={audience}
              onChange={(e) => {
                const v = e.target.value as BroadcastAudience;
                setAudience(v);
                refreshCount(v, role);
              }}
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} — {a.hint}
                </option>
              ))}
            </select>
          </div>

          {audience === "ROLE" && (
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  refreshCount(audience, e.target.value);
                }}
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Who this actually reaches — shown before sending, not after. */}
          <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            {count ? (
              <span>
                <span className="font-semibold text-foreground">{count.count}</span>{" "}
                recipient{count.count === 1 ? "" : "s"}
                {sendEmail && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-semibold text-foreground">
                      {count.withEmail}
                    </span>{" "}
                    with an email address
                    {count.count - count.withEmail > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({count.count - count.withEmail} will only see it in-app)
                      </span>
                    )}
                  </>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Counting recipients…</span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
              placeholder="e.g. System maintenance on Saturday"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do they need to know?"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4"
            />
            Also send by email
          </label>

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>A broadcast cannot be recalled once sent.</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send broadcast
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
