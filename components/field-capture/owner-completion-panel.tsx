"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  fillParkOwnerDetails,
  submitCapturedPark,
  fillCompanyOwnerDetails,
  submitCapturedCompany,
} from "@/app/actions/field-capture";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Completing a record an Enumerator captured in the field.
 *
 * Two jobs on one panel, in the order they have to happen: name the owner,
 * then submit. Submission is deliberately a separate button — it is the point
 * where the documents are checked, and it will refuse and say what is
 * missing, so it must not fire as a side effect of saving a phone number.
 */
export function OwnerCompletionPanel({
  kind,
  entityId,
  status,
  capturedBy,
  owner,
}: {
  kind: "park" | "company";
  entityId: string;
  status: string;
  /** Name of the Enumerator who captured it, for the audit line. */
  capturedBy: string | null;
  owner: {
    contactPerson: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    managerResidentialAddress?: string | null;
    cacNumber?: string | null;
    hasAccount: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    contactPerson: owner.contactPerson ?? "",
    contactPhone: owner.contactPhone ?? "",
    contactEmail: owner.contactEmail ?? "",
    managerResidentialAddress: owner.managerResidentialAddress ?? "",
    cacNumber: owner.cacNumber ?? "",
    contactUserId: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = () =>
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const res =
        kind === "park"
          ? await fillParkOwnerDetails(entityId, {
              contactPerson: form.contactPerson,
              contactPhone: form.contactPhone,
              contactEmail: form.contactEmail,
              managerResidentialAddress: form.managerResidentialAddress,
              contactUserId: form.contactUserId || undefined,
            })
          : await fillCompanyOwnerDetails(entityId, {
              contactPerson: form.contactPerson,
              contactPhone: form.contactPhone,
              contactEmail: form.contactEmail,
              cacNumber: form.cacNumber || undefined,
              contactUserId: form.contactUserId || undefined,
            });

      if (!res.success) setError(res.error ?? "Could not save.");
      else {
        setSaved(true);
        router.refresh();
      }
    });

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res =
        kind === "park"
          ? await submitCapturedPark(entityId)
          : await submitCapturedCompany(entityId);

      if (!res.success) setError(res.error ?? "Could not submit.");
      else router.refresh();
    });

  const isDraft = status === "DRAFT";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <UserPlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Captured in the field</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {capturedBy ? `Recorded by ${capturedBy}. ` : ""}
              The owner&apos;s details were not available at the site. Fill them
              in here — this record belongs to nobody until you do.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Owner / manager name"
            value={form.contactPerson}
            onChange={(v) => set("contactPerson", v)}
          />
          <Field
            label="Phone number"
            value={form.contactPhone}
            onChange={(v) => set("contactPhone", v)}
            placeholder="08030000000"
          />
          <Field
            label="Email address"
            value={form.contactEmail}
            onChange={(v) => set("contactEmail", v)}
            placeholder="Leave blank if they have none"
          />
          {kind === "park" ? (
            <Field
              label="Residential address"
              value={form.managerResidentialAddress}
              onChange={(v) => set("managerResidentialAddress", v)}
            />
          ) : (
            <Field
              label="CAC number"
              value={form.cacNumber}
              onChange={(v) => set("cacNumber", v)}
            />
          )}
        </div>

        {!owner.hasAccount && (
          <div className="flex flex-col gap-1.5">
            <Field
              label="Hand over to an applicant account (optional)"
              value={form.contactUserId}
              onChange={(v) => set("contactUserId", v)}
              placeholder="Applicant account ID"
            />
            <p className="text-xs text-muted-foreground">
              Once linked, the record moves onto the operator&apos;s own
              dashboard and out of the Ministry&apos;s hands.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50">
            Save owner details
          </button>

          {isDraft && (
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
              Submit application
            </button>
          )}
        </div>

        {isDraft && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Submitting checks the documents and site photographs. If anything is
            outstanding it will say what, and nothing is submitted.
          </p>
        )}

        {saved && !error && (
          <p className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Owner details saved.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}
