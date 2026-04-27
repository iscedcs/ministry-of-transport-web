"use client";

/**
 * Inspection Checklist Form — Ministry of Transport Platform
 * STORY-024 | FR-012
 *
 * Field inspector completes the physical standards checklist
 * and submits their overall assessment + recommendation.
 *
 * Checklist items are loaded from the active MOTOR_PARK
 * InspectionChecklistTemplate (seeded in prisma/seed.ts).
 *
 * Standards (FR-012):
 *  - Parking arrangement
 *  - Entrance/exit with gatehouse
 *  - Paved and fenced land
 *  - Separate male/female conveniences
 *  - Water supply
 *  - Refreshment (non-alcoholic)
 *  - Ticketing office
 *  - Waiting lounge
 *  - Manager's office
 *  - Minimum 2 × 9 kg DCP fire extinguishers
 */

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  submitInspectionReport,
  getMotorParkChecklistTemplate,
} from "@/app/actions/motor-park";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ── Types ──────────────────────────────────────────────────────────────────────

type ChecklistItem = {
  id: string;
  itemName: string;
  itemCategory: string;
  description: string | null;
  isRequired: boolean;
};

type ChecklistState = Record<string, { compliant: boolean; notes: string }>;

type SubmitState = ActionResult | undefined;

// ── Checklist item row ─────────────────────────────────────────────────────────

function ChecklistRow({
  item,
  state,
  onChange,
}: {
  item: ChecklistItem;
  state: { compliant: boolean; notes: string };
  onChange: (
    id: string,
    field: "compliant" | "notes",
    value: boolean | string,
  ) => void;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        state.compliant
          ? "border-border/50 bg-background"
          : "border-destructive/30 bg-destructive/5"
      }`}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={`check-${item.id}`}
          checked={state.compliant}
          onCheckedChange={(v) => onChange(item.id, "compliant", !!v)}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-1 flex-1">
          <label
            htmlFor={`check-${item.id}`}
            className="text-sm font-medium cursor-pointer leading-snug">
            {item.itemName}
            {item.isRequired && (
              <span className="text-destructive ml-1 text-xs">*</span>
            )}
          </label>
          {item.description && (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          )}
          <Textarea
            placeholder="Notes (optional)…"
            value={state.notes}
            onChange={(e) => onChange(item.id, "notes", e.target.value)}
            rows={2}
            className="mt-2 text-xs resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function InspectionChecklistPage() {
  const params = useParams<{ id: string; inspectionId: string }>();
  const router = useRouter();
  const { id: parkId, inspectionId } = params;

  // Checklist template
  const [template, setTemplate] = useState<{
    id: string;
    name: string;
    items: ChecklistItem[];
  } | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Per-item compliance state
  const [checklistState, setChecklistState] = useState<ChecklistState>({});

  // Recommendation + overall assessment
  const [recommendation, setRecommendation] = useState("APPROVE");

  useEffect(() => {
    getMotorParkChecklistTemplate().then((result) => {
      if (result.success && result.data) {
        setTemplate(result.data);
        // Initialise all items as non-compliant
        const init: ChecklistState = {};
        for (const item of result.data.items) {
          init[item.id] = { compliant: false, notes: "" };
        }
        setChecklistState(init);
      } else {
        setTemplateError(
          result.success ? "No checklist template found" : result.error,
        );
      }
      setLoadingTemplate(false);
    });
  }, []);

  function handleItemChange(
    id: string,
    field: "compliant" | "notes",
    value: boolean | string,
  ) {
    setChecklistState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  // Group by category
  const itemsByCategory = template
    ? template.items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
        if (!acc[item.itemCategory]) acc[item.itemCategory] = [];
        acc[item.itemCategory].push(item);
        return acc;
      }, {})
    : {};

  // Compliance summary
  const totalRequired = template?.items.filter((i) => i.isRequired).length ?? 0;
  const compliantRequired =
    template?.items.filter(
      (i) => i.isRequired && checklistState[i.id]?.compliant,
    ).length ?? 0;

  const [state, action, isPending] = useActionState<SubmitState, FormData>(
    submitInspectionReport as (
      s: SubmitState,
      f: FormData,
    ) => Promise<SubmitState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/motor-parks/${parkId}`);
    }
  }, [state, parkId, router]);

  const err = state && !state.success ? state.error : undefined;

  if (loadingTemplate) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-24 rounded-lg border border-border bg-secondary/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (templateError) {
    return (
      <div className="max-w-xl">
        <Alert variant="destructive">
          <AlertDescription>
            {templateError}. Please run{" "}
            <code className="text-xs">pnpm prisma db seed</code> to populate
            checklist templates.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href="/motor-parks"
            className="hover:text-foreground transition-colors">
            Motor Parks
          </Link>
          <span>/</span>
          <Link
            href={`/motor-parks/${parkId}`}
            className="hover:text-foreground transition-colors">
            Application
          </Link>
          <span>/</span>
          <span className="text-foreground">Inspection Report</span>
        </nav>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}>
          Inspection Checklist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-012 — Evaluate all physical standards. Required items marked{" "}
          <span className="text-destructive font-medium">*</span>.
        </p>
      </div>

      {/* Compliance progress */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
        <span className="text-sm text-muted-foreground">
          Required items met:
        </span>
        <span
          className={`text-sm font-semibold ${
            compliantRequired === totalRequired
              ? "text-[var(--success-text)]"
              : "text-destructive"
          }`}>
          {compliantRequired} / {totalRequired}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: totalRequired
                ? `${(compliantRequired / totalRequired) * 100}%`
                : "0%",
            }}
          />
        </div>
      </div>

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <form
        action={(formData) => {
          // Inject checklist JSON + hidden fields before submitting
          formData.set("inspectionId", inspectionId);
          formData.set("recommendedAction", recommendation);
          const checklistItems = Object.entries(checklistState).map(
            ([itemId, val]) => ({
              checklistItemId: itemId,
              isCompliant: val.compliant,
              notes: val.notes || undefined,
            }),
          );
          formData.set("checklistItems", JSON.stringify(checklistItems));
          return action(formData);
        }}
        noValidate
        className="flex flex-col gap-6">
        {/* Checklist sections grouped by category */}
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base">
                {category.replace(/_/g, " ")}
              </CardTitle>
              <CardDescription>
                {items.filter((i) => i.isRequired).length} required ·{" "}
                {items.length} total
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {items.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  state={
                    checklistState[item.id] ?? { compliant: false, notes: "" }
                  }
                  onChange={handleItemChange}
                />
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Overall assessment + recommendation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall Assessment</CardTitle>
            <CardDescription>
              Summary and final recommendation to the Commissioner/PS.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="overallAssessment">Assessment Notes</Label>
              <Textarea
                id="overallAssessment"
                name="overallAssessment"
                placeholder="Describe the overall condition of the proposed site, any deficiencies observed, and supporting comments…"
                rows={5}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recommendation">Recommendation</Label>
              <Select
                value={recommendation}
                onValueChange={setRecommendation}
                name="recommendedAction">
                <SelectTrigger id="recommendation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">
                    Approve — site meets all required standards
                  </SelectItem>
                  <SelectItem value="CONDITIONAL">
                    Conditional — approve with conditions/rectifications
                  </SelectItem>
                  <SelectItem value="REJECT">
                    Reject — site does not meet minimum standards
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href={`/motor-parks/${parkId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Submitting…" : "Submit Inspection Report"}
          </Button>
        </div>
      </form>
    </div>
  );
}
