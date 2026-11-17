"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addGroupMembers,
  disbandEnforcementGroup,
  removeGroupMember,
  setGroupLeader,
  updateEnforcementGroup,
} from "@/app/actions/enforcement-groups";
import {
  ENFORCEMENT_GROUP_MIN_MEMBERS as MIN,
  ENFORCEMENT_TYPES,
} from "@/lib/enforcement-type";

interface Member {
  id: string;
  firstName: string;
  surname: string;
  lga: string;
  phoneNumber?: string;
}

export function GroupManager({
  group,
  members,
  eligible,
}: {
  group: {
    id: string;
    name: string;
    area: string;
    unit: string;
    leaderApplicationId: string | null;
  };
  members: Member[];
  eligible: Omit<Member, "phoneNumber">[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(group.name);
  const [area, setArea] = useState(group.area);
  const [unit, setUnit] = useState(group.unit);

  const [search, setSearch] = useState("");
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [confirmDisband, setConfirmDisband] = useState(false);

  const atMinimum = members.length <= MIN;

  const visibleEligible = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return eligible;
    return eligible.filter((p) =>
      `${p.firstName} ${p.surname} ${p.lga}`.toLowerCase().includes(t),
    );
  }, [eligible, search]);

  /** Run a server action, toast the outcome, refresh the page data. */
  function run(
    action: () => Promise<{ success: true } | { success: false; error: string }>,
    ok: string,
    after?: () => void,
  ) {
    startTransition(async () => {
      const res = await action();
      if (res.success) {
        toast.success(ok);
        after?.();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  const detailsChanged =
    name !== group.name || area !== group.area || unit !== group.unit;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Group details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Area / LGA</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENFORCEMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Button
              disabled={!detailsChanged || pending}
              onClick={() =>
                run(
                  () => updateEnforcementGroup(group.id, { name, area, unit }),
                  "Group updated.",
                )
              }>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
            {unit !== group.unit && (
              <span className="ml-3 text-xs text-muted-foreground">
                All members will move to the new unit.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>
            A group must keep at least {MIN} members.
            {atMinimum && " It is at the minimum, so add someone before removing anyone."}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.map((m) => {
            const isLeader = group.leaderApplicationId === m.id;
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <Link
                    href={`/admin/park-monitors/${m.id}`}
                    className="text-sm font-medium hover:underline">
                    {m.firstName} {m.surname}
                  </Link>
                  {isLeader && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                      Team leader
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {m.lga}
                    {m.phoneNumber ? ` · ${m.phoneNumber}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!isLeader && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => setGroupLeader(group.id, m.id),
                            `${m.firstName} is now the team leader.`,
                          )
                        }>
                        Make leader
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending || atMinimum}
                        title={
                          atMinimum
                            ? `A group needs at least ${MIN} members`
                            : undefined
                        }
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() =>
                          run(
                            () => removeGroupMember(group.id, m.id),
                            "Member removed.",
                          )
                        }>
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add members</CardTitle>
          <CardDescription>
            Approved people who are not in a group yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Everyone approved is already in a group.
            </p>
          ) : (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or LGA"
              />
              <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {visibleEligible.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={toAdd.includes(p.id)}
                      onChange={() =>
                        setToAdd((cur) =>
                          cur.includes(p.id)
                            ? cur.filter((x) => x !== p.id)
                            : [...cur, p.id],
                        )
                      }
                    />
                    <span className="flex-1 text-sm font-medium">
                      {p.firstName} {p.surname}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.lga}</span>
                  </label>
                ))}
              </div>
              <Button
                disabled={toAdd.length === 0 || pending}
                onClick={() =>
                  run(
                    () => addGroupMembers(group.id, toAdd),
                    `${toAdd.length} added.`,
                    () => setToAdd([]),
                  )
                }>
                Add {toAdd.length > 0 ? toAdd.length : ""} selected
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Disband group</CardTitle>
          <CardDescription>
            Removes the group. Its members stay approved, keep their ID cards,
            and go back to the list of people not in a group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!confirmDisband ? (
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setConfirmDisband(true)}>
              Disband this group
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Disband “{group.name}”?</span>
              <Button
                disabled={pending}
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() =>
                  run(
                    () => disbandEnforcementGroup(group.id),
                    "Group disbanded.",
                    () => router.push("/admin/park-monitors/groups"),
                  )
                }>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, disband
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDisband(false)}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
