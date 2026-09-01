"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRevalidationApplication } from "@/app/actions/revalidation-edit";
import { FACILITY_OPTIONS } from "@/lib/revalidation-checklist";
import { ANAMBRA_LGAS } from "@/lib/consts";
import { cn } from "@/lib/utils";

type Field =
  | { name: string; label: string; type: "text" | "number" | "date" }
  | { name: string; label: string; type: "boolean" }
  | { name: string; label: string; type: "select"; options: string[] }
  /** A tick list of every facility the Ministry recognises. */
  | { name: string; label: string; type: "facilities" };

const SECTIONS: { key: string; title: string; blurb: string; fields: Field[] }[] = [
  {
    key: "A",
    title: "Section A — Applicant details",
    blurb: "Who owns and represents the park.",
    fields: [
      { name: "ownerName", label: "Owner name", type: "text" },
      {
        name: "ownershipType",
        label: "Ownership type",
        type: "select",
        options: [
          "Individual",
          "Registered Company",
          "Cooperative Society",
          "Transport Union",
          "Government",
          "Community Organization",
          "Other",
        ],
      },
      { name: "representativeName", label: "Representative name", type: "text" },
      { name: "designation", label: "Designation", type: "text" },
      { name: "phoneNumber", label: "Phone number", type: "text" },
      { name: "alternatePhoneNumber", label: "Alternate phone", type: "text" },
      { name: "emailAddress", label: "Email address", type: "text" },
      { name: "residentialAddress", label: "Residential address", type: "text" },
      { name: "cacRegistrationNumber", label: "CAC number", type: "text" },
    ],
  },
  {
    key: "B",
    title: "Section B — ASIN details",
    blurb: "State and federal identifiers.",
    fields: [
      { name: "asinNumber", label: "ASIN number", type: "text" },
      { name: "nin", label: "NIN", type: "text" },
      { name: "tin", label: "TIN", type: "text" },
    ],
  },
  {
    key: "C",
    title: "Section C — Park information",
    blurb: "What and where the facility is.",
    fields: [
      { name: "parkName", label: "Park name", type: "text" },
      {
        name: "facilityType",
        label: "Facility type",
        type: "select",
        options: ["Private", "Public", "Loading Bay"],
      },
      { name: "physicalLocation", label: "Physical location (Street Address)", type: "text" },
      { name: "townCommunity", label: "Town / community / City", type: "text" },
      {
        name: "lga",
        label: "LGA",
        type: "select",
        options: [...ANAMBRA_LGAS],
      },
    ],
  },
  {
    key: "D",
    title: "Section D — Operational information",
    blurb: "How the park runs day to day.",
    fields: [
      { name: "yearEstablished", label: "Year established", type: "text" },
      {
        name: "operationalStatus",
        label: "Operational status",
        type: "select",
        options: [
          "Fully Operational",
          "Partially Operational",
          "Under Renovation",
          "Temporarily Closed",
        ],
      },
      { name: "dailyVehiclesCount", label: "Vehicles per day", type: "text" },
      { name: "vehicleTypes", label: "Vehicle types", type: "text" },
    ],
  },
  {
    key: "E",
    title: "Section E — Facilities available",
    blurb:
      "Tick everything present at the park. This is what the inspector verifies item by item on site.",
    fields: [
      {
        name: "facilitiesAvailable",
        label: "Facilities present",
        type: "facilities",
      },
    ],
  },
  {
    key: "F",
    title: "Section F — Regulatory compliance",
    blurb: "Not supplied by the previous vendor — needs completing.",
    fields: [
      { name: "existingApprovalNum", label: "Existing approval number", type: "text" },
      { name: "maintainsManifest", label: "Maintains passenger manifest", type: "boolean" },
      { name: "operatorsRegistered", label: "Operators registered with MOT", type: "boolean" },
      { name: "paymentsUpToDate", label: "Payments up to date", type: "boolean" },
      { name: "safetySignages", label: "Safety signage installed", type: "boolean" },
      { name: "pendingSanctions", label: "Has pending sanctions", type: "boolean" },
      { name: "sanctionDetails", label: "Sanction details", type: "text" },
    ],
  },
  {
    key: "G",
    title: "Section G — Employment & security",
    blurb: "Headcount and security arrangement.",
    fields: [
      { name: "managementStaffCount", label: "Management staff", type: "number" },
      { name: "adminStaffCount", label: "Administrative staff", type: "number" },
      { name: "securityStaffCount", label: "Security personnel", type: "number" },
      { name: "otherStaffCount", label: "Other staff", type: "number" },
      { name: "securityArrangement", label: "Security arrangement", type: "text" },
    ],
  },
  {
    key: "H",
    title: "Section H — Revenue information",
    blurb: "Not supplied by the previous vendor — needs completing.",
    fields: [
      { name: "estimatedDailyRevenue", label: "Estimated daily revenue (₦)", type: "number" },
      { name: "estimatedMonthlyRev", label: "Estimated monthly revenue (₦)", type: "number" },
      {
        name: "revenueCollectionMethod",
        label: "Revenue collection method",
        type: "select",
        options: ["Cash", "POS", "Bank Transfer", "Ticketing", "Mixed"],
      },
    ],
  },
];

/**
 * Every facility the Ministry recognises, as a tick list.
 *
 * The edit form had no facilities section at all — Section E was simply
 * absent, so an officer could not correct what a park had declared. The list
 * is the same FACILITY_OPTIONS the inspector's checklist is built from, so the
 * two can never fall out of step.
 */
function FacilityPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  let selected: string[] = [];
  try {
    const parsed = JSON.parse(value || "[]");
    selected = Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    selected = [];
  }

  function toggle(label: string) {
    const next = selected.includes(label)
      ? selected.filter((x) => x !== label)
      : [...selected, label];
    onChange(JSON.stringify(next));
  }

  return (
    <div className="sm:col-span-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {FACILITY_OPTIONS.map((label) => {
          const on = selected.includes(label);
          return (
            <label
              key={label}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                on
                  ? "border-primary/40 bg-primary/5 font-medium"
                  : "border-border hover:bg-secondary",
              )}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(label)}
                className="h-4 w-4"
              />
              {label}
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {selected.length} of {FACILITY_OPTIONS.length} selected
      </p>
    </div>
  );
}

export function EditRevalidationClient({
  applicationId,
  parkName,
  initial,
  incompleteSections,
  isVendorImport,
}: {
  applicationId: string;
  parkName: string;
  initial: Record<string, string>;
  incompleteSections: string[];
  isVendorImport: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(initial);

  const set = (name: string, v: string) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateRevalidationApplication(applicationId, values);
      if (res.success) {
        const left = res.data?.stillMissing ?? [];
        toast.success(
          left.length
            ? `Saved. Sections ${left.join(", ")} still incomplete.`
            : "Saved — this application is now complete.",
        );
        router.push(`/admin/revalidation-queue/${applicationId}`);
      } else {
        toast.error(res.error ?? "Failed to save");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <Link
        href={`/admin/revalidation-queue/${applicationId}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>

      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Edit {parkName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete or correct this application. Leave a field blank to keep it
          recorded as &ldquo;Not stated&rdquo;.
        </p>
      </div>

      {isVendorImport && incompleteSections.length > 0 && (
        <Card className="border-amber-500/40">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                Migrated record — sections {incompleteSections.join(", ")} are
                incomplete
              </p>
              <p className="mt-1 text-muted-foreground">
                This park came from the previous vendor&apos;s register, which
                did not carry every field. Anything you leave blank stays
                &ldquo;Not stated&rdquo; and will not be read as a &ldquo;No&rdquo;.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={submit} className="flex flex-col gap-5">
        {SECTIONS.map((section) => {
          const flagged = incompleteSections.includes(section.key);
          return (
            <Card
              key={section.key}
              className={flagged ? "border-amber-500/30" : undefined}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {section.title}
                  {flagged && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      Incomplete
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{section.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                {section.fields.map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <label
                      htmlFor={f.name}
                      className="text-sm font-medium text-foreground">
                      {f.label}
                    </label>

                    {f.type === "facilities" ? (
                      <FacilityPicker
                        value={values[f.name] ?? "[]"}
                        onChange={(next) => set(f.name, next)}
                      />
                    ) : f.type === "boolean" ? (
                      <select
                        id={f.name}
                        value={values[f.name] ?? ""}
                        onChange={(e) => set(f.name, e.target.value)}
                        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        <option value="">Not stated</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : f.type === "select" ? (
                      <select
                        id={f.name}
                        value={values[f.name] ?? ""}
                        onChange={(e) => set(f.name, e.target.value)}
                        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        <option value="">Not stated</option>
                        {f.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={f.name}
                        type={f.type === "number" ? "number" : "text"}
                        min={f.type === "number" ? 0 : undefined}
                        value={values[f.name] ?? ""}
                        onChange={(e) => set(f.name, e.target.value)}
                        placeholder="Not stated"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
          <Button asChild variant="outline" type="button">
            <Link href={`/admin/revalidation-queue/${applicationId}`}>
              Cancel
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
