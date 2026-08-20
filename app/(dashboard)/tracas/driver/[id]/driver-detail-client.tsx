"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  IdCard,
  Phone,
  X,
  Check,
  Bus,
} from "lucide-react";
import { updateTracasDriver } from "@/app/actions/tracas";
import { canEditDriver } from "@/lib/fleet-roles";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DriverVehicle {
  id: string;
  registrationNumber: string;
  fleetNumber: string;
  category: string;
  makeModel: string | null;
  status: string;
}

interface Driver {
  id: string;
  fullName: string;
  phoneNumber: string;
  securityCode: string | null;
  email: string | null;
  photoUrl: string | null;
  nin: string | null;
  asinNumber: string | null;
  residentialAddress: string | null;
  stateOfOrigin: string | null;
  lga: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  educationalQualification: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  guarantorAddress: string | null;
  licenseNumber: string | null;
  licenseIssueDate: Date | null;
  licenseExpiryDate: Date | null;
  operatorAssociation: string | null;
  notes: string | null;
  status: string;
  idCardStatus: string;
  vehicles: DriverVehicle[];
}

/** The editable fields, in the order they are asked for at onboarding. */
const SECTIONS: {
  title: string;
  fields: {
    key: keyof Driver;
    label: string;
    type?: "text" | "date" | "textarea";
  }[];
}[] = [
  {
    title: "Identity",
    fields: [
      { key: "fullName", label: "Full name" },
      { key: "phoneNumber", label: "Phone number" },
      { key: "email", label: "Email" },
      { key: "nin", label: "NIN" },
      { key: "asinNumber", label: "ASIN" },
      { key: "dateOfBirth", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender" },
      { key: "bloodGroup", label: "Blood group" },
      { key: "maritalStatus", label: "Marital status" },
      { key: "educationalQualification", label: "Education" },
    ],
  },
  {
    title: "Residence",
    fields: [
      { key: "residentialAddress", label: "Residential address", type: "textarea" },
      { key: "stateOfOrigin", label: "State of origin" },
      { key: "lga", label: "LGA" },
    ],
  },
  {
    title: "Licence",
    fields: [
      { key: "licenseNumber", label: "Licence number" },
      { key: "licenseIssueDate", label: "Issued", type: "date" },
      { key: "licenseExpiryDate", label: "Expires", type: "date" },
      { key: "operatorAssociation", label: "Operator association" },
    ],
  },
  {
    title: "Next of kin & guarantor",
    fields: [
      { key: "nextOfKinName", label: "Next of kin" },
      { key: "nextOfKinPhone", label: "Next of kin phone" },
      { key: "emergencyContactName", label: "Emergency contact" },
      { key: "emergencyContactPhone", label: "Emergency phone" },
      { key: "guarantorName", label: "Guarantor" },
      { key: "guarantorPhone", label: "Guarantor phone" },
      { key: "guarantorAddress", label: "Guarantor address", type: "textarea" },
    ],
  },
];

const asInput = (v: unknown, type?: string) => {
  if (v == null) return "";
  if (type === "date") {
    const d = new Date(v as string);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  return String(v);
};

const show = (v: unknown, type?: string) => {
  if (v == null || v === "") return "—";
  if (type === "date") {
    const d = new Date(v as string);
    return Number.isNaN(d.getTime()) ? "—" : d.toDateString();
  }
  return String(v);
};

export function DriverDetailClient({
  driver,
  currentUserRole,
}: {
  driver: Driver;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const canEdit = canEditDriver(currentUserRole);

  const [form, setForm] = useState(() => {
    const init: Record<string, string> = {};
    for (const s of SECTIONS)
      for (const f of s.fields) init[f.key] = asInput(driver[f.key], f.type);
    init.notes = driver.notes ?? "";
    return init;
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = () =>
    startTransition(async () => {
      // Send only what has a value; an empty box means "unchanged", not
      // "erase", which matters on a record an ID card was printed from.
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v.trim() !== "") payload[k] = v.trim();
      }

      const res = await updateTracasDriver(driver.id, payload as never);
      if (res.success) {
        toast.success("Driver record updated.");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(res.error || "Could not update the driver.");
      }
    });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href="/tracas?tab=drivers"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Drivers</span>
          </Link>

          {driver.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={driver.photoUrl}
              alt={driver.fullName}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-xl font-bold text-muted-foreground">
              {driver.fullName.charAt(0)}
            </span>
          )}

          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}>
              {driver.fullName}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {driver.phoneNumber}
              </span>
              {driver.securityCode && (
                <span className="font-mono text-xs">{driver.securityCode}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/tracas/driver/${driver.id}/id-card`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-secondary">
            <IdCard className="h-4 w-4" />
            ID card
          </Link>

          {canEdit &&
            (editing ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50">
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                  <Check className="h-4 w-4" />
                  {pending ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                <Pencil className="h-4 w-4" />
                Edit driver
              </button>
            ))}
        </div>
      </div>

      {/* Status strip */}
      <div className="flex flex-wrap gap-2">
        <Pill label="Status" value={driver.status} />
        <Pill label="ID card" value={driver.idCardStatus.replace(/_/g, " ")} />
        <Pill
          label="Vehicles"
          value={String(driver.vehicles.length)}
        />
      </div>

      {editing && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          These details are printed on the driver&apos;s ID card and named on
          the Letter of Authority. A field left blank is kept as it is, not
          cleared.
        </p>
      )}

      {/* Particulars */}
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardContent className="flex flex-col gap-3 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h2>

              <dl className="flex flex-col gap-2.5">
                {section.fields.map((f) => (
                  <div
                    key={String(f.key)}
                    className={cn(
                      "grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center",
                    )}>
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="text-sm font-medium text-foreground">
                      {editing ? (
                        f.type === "textarea" ? (
                          <textarea
                            rows={2}
                            value={form[f.key]}
                            onChange={(e) => set(f.key, e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                          />
                        ) : (
                          <input
                            type={f.type === "date" ? "date" : "text"}
                            value={form[f.key]}
                            onChange={(e) => set(f.key, e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                          />
                        )
                      ) : (
                        show(driver[f.key], f.type)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vehicles held */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Vehicles assigned
          </h2>

          {driver.vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No vehicle is assigned to this driver.
            </p>
          ) : (
            <div className="divide-y rounded-xl border">
              {driver.vehicles.map((v) => (
                <Link
                  key={v.id}
                  href={`/tracas/${v.id}`}
                  className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-secondary/50">
                  <span className="flex items-center gap-2.5">
                    <Bus className="h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <span className="text-sm font-semibold">
                        {v.fleetNumber}
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {v.registrationNumber}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {v.makeModel ?? v.category}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  );
}
