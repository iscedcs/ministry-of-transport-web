"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { createEnforcementGroup } from "@/app/actions/enforcement-groups";
import {
  DEFAULT_ENFORCEMENT_TYPE,
  ENFORCEMENT_GROUP_MIN_MEMBERS as MIN,
  ENFORCEMENT_TYPES,
  enforcementTypeLabel,
} from "@/lib/enforcement-type";

interface Person {
  id: string;
  firstName: string;
  surname: string;
  lga: string;
  enforcementType: string;
}

export function CreateGroupForm({ eligible }: { eligible: Person[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [unit, setUnit] = useState<string>(DEFAULT_ENFORCEMENT_TYPE);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [leader, setLeader] = useState("");

  const visible = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return eligible;
    return eligible.filter((p) =>
      `${p.firstName} ${p.surname} ${p.lga}`.toLowerCase().includes(t),
    );
  }, [eligible, search]);

  const chosen = eligible.filter((p) => selected.includes(p.id));
  const enough = selected.length >= MIN;
  const leaderValid = leader !== "" && selected.includes(leader);
  const ready =
    enough && leaderValid && name.trim() !== "" && area.trim() !== "";

  function toggle(id: string) {
    setSelected((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      if (leader && !next.includes(leader)) setLeader("");
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      const res = await createEnforcementGroup({
        name,
        unit,
        area,
        leaderApplicationId: leader,
        memberIds: selected,
      });
      if (res.success) {
        toast.success("Group created.");
        router.push(`/admin/park-monitors/groups/${res.groupId}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Group details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
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
            <p className="text-xs text-muted-foreground">
              Everyone you add will be placed in this unit.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Group name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Onitsha Alpha Team"
            />
          </div>
          <div className="space-y-1">
            <Label>Area / LGA covered</Label>
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Onitsha North"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Approved people who are not in a group yet. Pick at least {MIN}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or LGA"
          />
          <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {visible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {eligible.length === 0
                  ? "Everyone approved is already in a group."
                  : "No one matches your search."}
              </p>
            ) : (
              visible.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="flex-1 text-sm font-medium">
                    {p.firstName} {p.surname}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.lga} · {enforcementTypeLabel(p.enforcementType)}
                  </span>
                </label>
              ))
            )}
          </div>
          <p
            className={`text-sm font-medium ${enough ? "text-green-600" : "text-amber-600"}`}>
            {selected.length} selected
            {enough ? "" : ` — ${MIN - selected.length} more needed`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team leader</CardTitle>
          <CardDescription>
            The leader must be one of the selected members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={leader}
            onValueChange={setLeader}
            disabled={chosen.length === 0}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  chosen.length === 0
                    ? "Select members first"
                    : "Choose the team leader"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {chosen.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.firstName} {p.surname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Button
        onClick={submit}
        disabled={!ready || pending}
        className="w-full h-11">
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create group
      </Button>
    </div>
  );
}
