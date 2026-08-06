"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Printer, UserPlus, Power, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createTracasIctAccount,
  toggleTracasStaffActive,
  type TracasStaffMember,
} from "@/app/actions/tracas-staff";

/** Suggests a reasonable temporary password so the MD isn't inventing one. */
function suggestPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Tracas-${out.slice(0, 8)}`;
}

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  designation: "",
  temporaryPassword: "",
};

export function TracasStaffClient({
  staff,
  canManage,
}: {
  staff: TracasStaffMember[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [copied, setCopied] = useState(false);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, temporaryPassword: suggestPassword() });
    setCopied(false);
    setIsCreateOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTracasIctAccount(form);
      if (res.success) {
        toast.success(`Account created for ${res.email}.`);
        setIsCreateOpen(false);
        setForm(EMPTY_FORM);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to create the account.");
      }
    });
  };

  const handleToggle = (member: TracasStaffMember) => {
    startTransition(async () => {
      const res = await toggleTracasStaffActive(member.id, !member.isActive);
      if (res.success) {
        toast.success(
          `${member.firstName} ${member.lastName} ${
            member.isActive ? "deactivated" : "reactivated"
          }.`,
        );
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to update the account.");
      }
    });
  };

  const activeCount = staff.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TRACAS Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Printing officers who handle TRACAS driver ID cards and letters of
            authority. {activeCount} of {staff.length} active.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-2 cursor-pointer">
            <UserPlus className="w-4 h-4" />
            Add printing officer
          </Button>
        )}
      </div>

      <Card className="bg-card border-border/60">
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <div className="p-12 text-center">
              <Printer className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No TRACAS printing officers yet.
              </p>
              {canManage && (
                <Button
                  variant="outline"
                  onClick={openCreate}
                  className="mt-4 cursor-pointer">
                  Add the first one
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {staff.map((m) => (
                <li
                  key={m.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">
                        {m.firstName} {m.lastName}
                      </span>
                      <Badge
                        className={
                          m.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold"
                            : "bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold"
                        }>
                        {m.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.email}
                      {m.phone ? ` · ${m.phone}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {m.designation ?? "TRACAS Printing Officer"} ·{" "}
                      {m.lastLoginAt
                        ? `last signed in ${new Date(m.lastLoginAt).toLocaleDateString("en-GB")}`
                        : "never signed in"}
                    </p>
                  </div>

                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleToggle(m)}
                      className={`gap-1.5 cursor-pointer flex-shrink-0 ${
                        m.isActive ? "text-red-500 hover:text-red-500" : ""
                      }`}>
                      <Power className="w-3.5 h-3.5" />
                      {m.isActive ? "Disable" : "Enable"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create account */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <UserPlus className="w-5 h-5 text-primary" />
              Add TRACAS Printing Officer
            </DialogTitle>
            <DialogDescription>
              They will only see TRACAS driver ID cards and letters of
              authority — no Ministry queues.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  placeholder="08012345678"
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={form.designation}
                  placeholder="TRACAS Printing Officer"
                  onChange={(e) =>
                    setForm({ ...form, designation: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="temporaryPassword">Temporary Password *</Label>
              <div className="flex gap-2">
                <Input
                  id="temporaryPassword"
                  value={form.temporaryPassword}
                  onChange={(e) =>
                    setForm({ ...form, temporaryPassword: e.target.value })
                  }
                  required
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(form.temporaryPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-shrink-0 cursor-pointer">
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Share this with the officer directly. They sign in at{" "}
                <span className="font-mono">/staff/login</span> and should
                change it immediately.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="cursor-pointer">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="cursor-pointer">
                {isPending ? "Creating..." : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
