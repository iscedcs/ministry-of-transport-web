"use client";

/**
 * Vehicle submission — one vehicle at a time.
 *
 * The operator declares a fleet size up front, then adds vehicles as their
 * particulars come to hand. The outstanding count falls with each one, so
 * "4 of 6 remaining" is always on screen and the operator can stop and come
 * back.
 *
 * Previously the page rendered every declared slot as a blank form at once,
 * which meant an operator with six vehicles had to hold all six sets of
 * particulars before submitting anything.
 *
 * Access: EXTERNAL_APPLICANT (and ENUMERATOR, onboarding on their behalf)
 */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bus,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  getPendingVehicleSubmissionRequests,
  addVehicleToSubmission,
  removeSubmittedVehicle,
} from "@/app/actions/mass-transit";
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
import { cn } from "@/lib/utils";

const VEHICLE_TYPES = [
  { value: "BUS", label: "Bus" },
  { value: "MINIBUS", label: "Minibus" },
  { value: "TRUCK", label: "Truck" },
  { value: "LIGHT_COMMERCIAL", label: "Light Commercial" },
  { value: "TANKER", label: "Tanker" },
  { value: "TAXI", label: "Taxi" },
  { value: "PRIVATE_CAR", label: "Private Car" },
  { value: "RIDE_HAILING", label: "Ride Hailing" },
];

interface SubmittedVehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  vehicleType: string;
}

interface RequestItem {
  id: string;
  companyId: string;
  companyName: string;
  vehicleCount: number;
  submittedCount: number;
  requestedAt: Date;
  vehicles: SubmittedVehicle[];
}

const EMPTY = {
  registrationNumber: "",
  vehicleType: "",
  make: "",
  model: "",
  engineNumber: "",
  chassisNumber: "",
  routesServed: "",
  roadworthinessExpiry: "",
};

export default function SubmitVehiclesPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  async function load() {
    const res = await getPendingVehicleSubmissionRequests();
    setRequests(res.success && res.data ? (res.data as RequestItem[]) : []);
    setLoading(false);
  }

  // Deferred so the state update lands outside the effect body — a
  // synchronous setState there triggers a second render pass.
  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      const res = await getPendingVehicleSubmissionRequests();
      if (!active) return;
      setRequests(res.success && res.data ? (res.data as RequestItem[]) : []);
      setLoading(false);
    }, 0);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, []);

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addVehicle(requestId: string) {
    const required: [keyof typeof EMPTY, string][] = [
      ["registrationNumber", "Registration number"],
      ["vehicleType", "Vehicle type"],
      ["make", "Make"],
      ["model", "Model"],
      ["engineNumber", "Engine number"],
      ["chassisNumber", "Chassis number"],
    ];
    for (const [field, label] of required) {
      if (!form[field].trim()) return toast.error(`${label} is required`);
    }

    startTransition(async () => {
      const res = await addVehicleToSubmission(requestId, {
        ...form,
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        engineNumber: form.engineNumber.trim().toUpperCase(),
        chassisNumber: form.chassisNumber.trim().toUpperCase(),
      });

      if (res.success) {
        const d = res.data!;
        toast.success(
          d.remaining > 0
            ? `Vehicle added — ${d.remaining} of ${d.declared} still to submit`
            : `Vehicle added — all ${d.declared} vehicles submitted`,
        );
        setForm({ ...EMPTY });
        if (d.remaining === 0) setOpenFor(null);
        await load();
      } else {
        toast.error(res.error ?? "Failed to add the vehicle");
      }
    });
  }

  function remove(id: string, reg: string) {
    if (!confirm(`Remove ${reg} from this declaration?`)) return;
    startTransition(async () => {
      const res = await removeSubmittedVehicle(id);
      if (res.success) {
        toast.success(`${reg} removed`);
        await load();
      } else {
        toast.error(res.error ?? "Failed to remove the vehicle");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submit Vehicle Details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your vehicles one at a time. You can stop and return — what you
          have submitted is kept.
        </p>
      </div>

      {requests.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="p-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
            <p className="font-semibold">Nothing outstanding</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You have no open vehicle declarations.
            </p>
          </CardContent>
        </Card>
      )}

      {requests.map((req) => {
        const remaining = req.vehicleCount - req.submittedCount;
        const pct = Math.round((req.submittedCount / req.vehicleCount) * 100);
        const isOpen = openFor === req.id;

        return (
          <Card key={req.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{req.companyName}</CardTitle>
                  <CardDescription>
                    Declared fleet of {req.vehicleCount} vehicle
                    {req.vehicleCount === 1 ? "" : "s"}
                  </CardDescription>
                </div>
                {/* The count the operator is working against. */}
                <div className="text-right">
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      remaining === 0 ? "text-emerald-500" : "text-primary",
                    )}>
                    {req.submittedCount}/{req.vehicleCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {remaining === 0
                      ? "all submitted"
                      : `${remaining} still to submit`}
                  </p>
                </div>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    remaining === 0 ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {/* What has been submitted so far */}
              {req.vehicles.length > 0 && (
                <div className="divide-y rounded-lg border">
                  {req.vehicles.map((v, i) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm">
                      <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                        {i + 1}
                      </span>
                      <Bus className="h-4 w-4 shrink-0 text-primary" />
                      <span className="font-mono font-semibold">
                        {v.registrationNumber}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {v.make} {v.model} ·{" "}
                        {VEHICLE_TYPES.find((t) => t.value === v.vehicleType)
                          ?.label ?? v.vehicleType}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(v.id, v.registrationNumber)}
                        disabled={isPending}
                        aria-label={`Remove ${v.registrationNumber}`}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {remaining === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    All {req.vehicleCount} vehicles submitted. The Ministry will
                    review them.
                  </span>
                </div>
              ) : !isOpen ? (
                <Button
                  onClick={() => {
                    setForm({ ...EMPTY });
                    setOpenFor(req.id);
                  }}
                  className="w-fit gap-2">
                  <Plus className="h-4 w-4" />
                  Add vehicle
                </Button>
              ) : (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Vehicle {req.submittedCount + 1} of {req.vehicleCount}
                    </p>
                    <button
                      type="button"
                      onClick={() => setOpenFor(null)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Close">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Registration number" required>
                      <Input
                        value={form.registrationNumber}
                        onChange={(e) => set("registrationNumber", e.target.value)}
                        placeholder="e.g. ABC123XY"
                        className="font-mono uppercase"
                      />
                    </Field>

                    <Field label="Vehicle type" required>
                      <select
                        value={form.vehicleType}
                        onChange={(e) => set("vehicleType", e.target.value)}
                        className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="">Select type</option>
                        {VEHICLE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Make" required>
                      <Input
                        value={form.make}
                        onChange={(e) => set("make", e.target.value)}
                        placeholder="e.g. Toyota"
                      />
                    </Field>

                    <Field label="Model" required>
                      <Input
                        value={form.model}
                        onChange={(e) => set("model", e.target.value)}
                        placeholder="e.g. Hiace"
                      />
                    </Field>

                    <Field label="Engine number" required>
                      <Input
                        value={form.engineNumber}
                        onChange={(e) => set("engineNumber", e.target.value)}
                        className="font-mono uppercase"
                      />
                    </Field>

                    <Field label="Chassis number" required>
                      <Input
                        value={form.chassisNumber}
                        onChange={(e) => set("chassisNumber", e.target.value)}
                        className="font-mono uppercase"
                      />
                    </Field>

                    <Field label="Routes served">
                      <Input
                        value={form.routesServed}
                        onChange={(e) => set("routesServed", e.target.value)}
                        placeholder="e.g. Awka – Onitsha"
                      />
                    </Field>

                    <Field label="Roadworthiness expiry">
                      <Input
                        type="date"
                        value={form.roadworthinessExpiry}
                        onChange={(e) =>
                          set("roadworthinessExpiry", e.target.value)
                        }
                      />
                    </Field>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => addVehicle(req.id)}
                      disabled={isPending}>
                      {isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save vehicle
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOpenFor(null)}
                      disabled={isPending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
