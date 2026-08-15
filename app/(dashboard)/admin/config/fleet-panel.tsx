"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Loader2, Hash } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  previewFleetRenumber,
  applyFleetRenumber,
  type PrefixReport,
  type RenumberChange,
  type RenumberMode,
} from "@/app/actions/fleet-numbering";

export interface VehicleOption {
  id: string;
  fleetNumber: string;
  registrationNumber: string;
  ownershipType: string;
}

const MODES: { value: RenumberMode; label: string; blurb: string }[] = [
  {
    value: "DIRECT",
    label: "Direct",
    blurb: "Only works when the target number is free. One vehicle moves.",
  },
  {
    value: "SWAP",
    label: "Swap",
    blurb: "The two vehicles exchange numbers. Exactly two rows move.",
  },
  {
    value: "INSERT",
    label: "Insert & shift",
    blurb:
      "The occupant and every number above it move up by one, keeping the sequence contiguous. Can move many vehicles.",
  },
];

export function FleetPanel({
  report,
  vehicles,
}: {
  report: { prefixes: PrefixReport[]; padding: number; unparseable: string[] };
  vehicles: VehicleOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [vehicleId, setVehicleId] = useState("");
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState<RenumberMode>("DIRECT");
  const [changes, setChanges] = useState<RenumberChange[] | null>(null);
  const [resolvedMode, setResolvedMode] = useState<RenumberMode | null>(null);
  const [warning, setWarning] = useState<string | undefined>();

  const selected = vehicles.find((v) => v.id === vehicleId);

  function preview() {
    if (!vehicleId) return toast.error("Choose a vehicle");
    if (!target.trim()) return toast.error("Enter the target fleet number");
    startTransition(async () => {
      const res = await previewFleetRenumber(vehicleId, target.trim(), mode);
      if (res.success && res.data) {
        setChanges(res.data.changes);
        setResolvedMode(res.data.mode);
        setWarning(res.data.warning);
      } else {
        setChanges(null);
        toast.error(res.error ?? "Could not build a preview");
      }
    });
  }

  function apply() {
    if (!changes) return;
    if (
      !confirm(
        `Renumber ${changes.length} vehicle(s)? Letters of authority already printed for them will show the old number.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await applyFleetRenumber(vehicleId, target.trim(), mode);
      if (res.success) {
        toast.success(`${res.data?.moved ?? 0} vehicle(s) renumbered`);
        setChanges(null);
        window.location.reload();
      } else {
        toast.error(res.error ?? "Renumber failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Current state of each sequence ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Sequences in use
          </CardTitle>
          <CardDescription>
            Live from the register. &ldquo;Next&rdquo; is what the onboarding
            form would assign right now.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {report.prefixes.map((p) => (
            <div key={p.prefix} className="rounded-lg border p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold tracking-tight">
                  {p.prefix}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.count} vehicle{p.count === 1 ? "" : "s"}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Range in use</dt>
                  <dd className="font-mono">
                    {p.prefix}
                    {String(p.min).padStart(report.padding, "0")} –{" "}
                    {p.prefix}
                    {String(p.max).padStart(report.padding, "0")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Next assigned</dt>
                  <dd className="font-mono font-semibold text-primary">
                    {p.next}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Unused gaps</dt>
                  <dd
                    className={cn(
                      "font-mono",
                      p.gaps.length > 0 && "text-amber-600 dark:text-amber-400",
                    )}>
                    {p.gaps.length === 0
                      ? "none"
                      : p.gaps.slice(0, 8).join(", ") +
                        (p.gaps.length > 8 ? ` +${p.gaps.length - 8}` : "")}
                  </dd>
                </div>
                {p.overrideNext > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Counter override</dt>
                    <dd className="font-mono text-primary">{p.overrideNext}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}

          {report.unparseable.length > 0 && (
            <div className="sm:col-span-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {report.unparseable.length} fleet number(s) do not follow the
                letters-then-digits pattern and are excluded from these counts:
              </p>
              <p className="mt-1 font-mono text-muted-foreground">
                {report.unparseable.slice(0, 12).join(", ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Renumber a vehicle ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Renumber a vehicle</CardTitle>
          <CardDescription>
            Nothing is written until you have seen the preview and confirmed.
            The whole move runs in one transaction — if any row fails, none
            change.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Vehicle</label>
              <select
                value={vehicleId}
                onChange={(e) => {
                  setVehicleId(e.target.value);
                  setChanges(null);
                }}
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">— Select a vehicle —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.fleetNumber} · {v.registrationNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                New fleet number
              </label>
              <Input
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value.toUpperCase());
                  setChanges(null);
                }}
                placeholder="e.g. LV097"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              If that number is already taken
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setMode(m.value);
                    setChanges(null);
                  }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    mode === m.value
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:bg-secondary",
                  )}>
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.blurb}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Button onClick={preview} disabled={isPending} variant="outline">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Preview changes
            </Button>
          </div>

          {changes && (
            <div className="rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                <p className="text-sm font-semibold">
                  {changes.length} vehicle{changes.length === 1 ? "" : "s"} will
                  move
                  {resolvedMode && resolvedMode !== mode && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (resolved as {resolvedMode.toLowerCase()} — the target was
                      free)
                    </span>
                  )}
                </p>
                <Button size="sm" onClick={apply} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Apply renumber
                </Button>
              </div>

              {warning && (
                <div className="flex items-start gap-2 border-b bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{warning}</span>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto divide-y">
                {changes.map((c) => (
                  <div
                    key={c.vehicleId}
                    className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="w-28 shrink-0 font-mono text-muted-foreground">
                      {c.registrationNumber}
                    </span>
                    <span className="font-mono">{c.from}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono font-semibold text-primary">
                      {c.to}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selected && !changes && (
            <p className="text-xs text-muted-foreground">
              {selected.registrationNumber} is currently{" "}
              <span className="font-mono">{selected.fleetNumber}</span> (
              {selected.ownershipType.replace(/_/g, " ").toLowerCase()}).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
