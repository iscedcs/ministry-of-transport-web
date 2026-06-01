"use client";

/**
 * Inspection Checklist Form — Ministry of Transport Platform
 * STORY-024 | FR-012
 *
 * Field inspector completes the physical standards checklist
 * and submits their overall assessment + recommendation.
 *
 * Evaluation format matches Ministry document AN/MOT/40/29:
 * S/N | Type of Facilities | Yes/No | Points | Score | Remarks
 *
 * Score auto-suggestion: toggling Yes sets score to maxPoints,
 * toggling No resets to 0. Inspector can override via pills or type.
 */

import { useActionState, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  submitInspectionReport,
  getMotorParkChecklistTemplate,
  getMotorPark,
  getInspection,
  saveInspectionDraft,
} from "@/app/actions/motor-park";
import {
  ExternalLink,
  Eye,
  Camera,
  Loader2,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trophy,
} from "lucide-react";
import type { ActionResult } from "@/lib/server-actions-pattern";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  maxPoints: number;
};

type ChecklistState = Record<
  string,
  { compliant: boolean; notes: string; photoUrl: string; score: number }
>;

type SubmitState = ActionResult | undefined;

// ── Score pill selector ────────────────────────────────────────────────────────

function ScorePills({
  maxPoints,
  value,
  onChange,
  disabled,
}: {
  maxPoints: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  // Generate meaningful pill options based on maxPoints
  const pills = useMemo(() => {
    const opts = new Set<number>([0]);
    if (maxPoints <= 5) {
      for (let i = 1; i <= maxPoints; i++) opts.add(i);
    } else if (maxPoints <= 10) {
      opts.add(Math.floor(maxPoints * 0.25));
      opts.add(Math.floor(maxPoints * 0.5));
      opts.add(Math.floor(maxPoints * 0.75));
      opts.add(maxPoints);
    } else {
      // 15 or 20
      opts.add(Math.floor(maxPoints * 0.25));
      opts.add(Math.floor(maxPoints * 0.5));
      opts.add(Math.floor(maxPoints * 0.75));
      opts.add(maxPoints);
    }
    return Array.from(opts).sort((a, b) => a - b);
  }, [maxPoints]);

  const [customMode, setCustomMode] = useState(false);
  const [rawInput, setRawInput] = useState(String(value));

  // Sync rawInput when value changes externally
  useEffect(() => {
    if (!customMode) setRawInput(String(value));
  }, [value, customMode]);

  if (disabled) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-muted-foreground">
        {value} / {maxPoints}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pills.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => {
            onChange(p);
            setCustomMode(false);
            setRawInput(String(p));
          }}
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-150
            ${
              !customMode && value === p
                ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                : "bg-secondary/60 text-foreground border-border hover:bg-primary/10 hover:border-primary/50"
            }`}
        >
          {p}
        </button>
      ))}
      {/* Custom input toggle */}
      {!customMode ? (
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
        >
          custom…
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={maxPoints}
            value={rawInput}
            autoFocus
            onChange={(e) => {
              setRawInput(e.target.value);
              const n = parseInt(e.target.value);
              if (!isNaN(n) && n >= 0 && n <= maxPoints) onChange(n);
            }}
            onBlur={() => {
              const n = parseInt(rawInput);
              if (isNaN(n) || n < 0) {
                onChange(0);
                setRawInput("0");
              } else if (n > maxPoints) {
                onChange(maxPoints);
                setRawInput(String(maxPoints));
              }
              setCustomMode(false);
            }}
            className="w-16 px-2 py-1 rounded-lg border border-primary/60 bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">/ {maxPoints}</span>
        </div>
      )}
    </div>
  );
}

// ── Evidence photo upload section ───────────────────────────────────────────────

function EvidencePhoto({
  itemId,
  photoUrl,
  onChange,
  disabled,
}: {
  itemId: string;
  photoUrl: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      onChange(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload.");
    } finally {
      setUploading(false);
    }
  };

  if (photoUrl) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative aspect-[4/3] w-16 rounded border border-border overflow-hidden bg-muted shrink-0">
          <img src={photoUrl} alt="Evidence" className="object-cover w-full h-full" />
        </div>
        <div className="flex flex-col gap-1">
          <a
            href={photoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-0.5 text-[10px] text-primary hover:underline font-medium"
          >
            View <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-0.5 text-[10px] text-destructive hover:underline font-medium"
            >
              <Trash2 className="w-2.5 h-2.5" /> Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        className={`flex items-center gap-1.5 border border-dashed border-border rounded-lg px-3 py-2 cursor-pointer text-[11px] font-medium text-muted-foreground hover:bg-secondary/30 transition-colors ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {uploading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Uploading…</>
        ) : (
          <><Camera className="w-3.5 h-3.5 text-primary" /> Add photo</>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />
      </label>
      {uploadError && (
        <span className="text-[10px] text-destructive">{uploadError}</span>
      )}
    </div>
  );
}

// ── Checklist table row ────────────────────────────────────────────────────────

function ChecklistRow({
  sn,
  item,
  state,
  onChange,
  disabled,
}: {
  sn: number;
  item: ChecklistItem;
  state: { compliant: boolean; notes: string; photoUrl: string; score: number };
  onChange: (
    id: string,
    field: "compliant" | "notes" | "photoUrl" | "score",
    value: boolean | string | number,
  ) => void;
  disabled?: boolean;
}) {
  const handleCompliantToggle = (compliant: boolean) => {
    onChange(item.id, "compliant", compliant);
    // Auto-suggest score based on Yes/No
    if (compliant) {
      onChange(item.id, "score", item.maxPoints);
    } else {
      onChange(item.id, "score", 0);
    }
  };

  const exceedsMax = state.score > item.maxPoints;

  return (
    <tr
      className={`border-b border-border/40 transition-colors ${
        state.compliant
          ? "bg-green-500/5 hover:bg-green-500/8"
          : "bg-destructive/5 hover:bg-destructive/8"
      }`}
    >
      {/* S/N */}
      <td className="py-3 pl-4 pr-2 text-xs font-medium text-muted-foreground w-10 text-center">
        {sn}
      </td>

      {/* Type of Facility */}
      <td className="py-3 px-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground leading-snug">
            {item.itemName}
          </span>
          {item.description && (
            <span className="text-[11px] text-muted-foreground leading-snug">
              {item.description}
            </span>
          )}
        </div>
      </td>

      {/* Yes / No toggle */}
      <td className="py-3 px-3 text-center w-28">
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleCompliantToggle(true)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150 ${
              state.compliant
                ? "bg-green-500 text-white border-green-500 shadow-sm"
                : "bg-secondary/60 text-muted-foreground border-border hover:border-green-400 hover:text-green-600"
            } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <CheckCircle2 className="w-3 h-3" /> Yes
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleCompliantToggle(false)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150 ${
              !state.compliant
                ? "bg-destructive text-white border-destructive shadow-sm"
                : "bg-secondary/60 text-muted-foreground border-border hover:border-destructive/50 hover:text-destructive"
            } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <XCircle className="w-3 h-3" /> No
          </button>
        </div>
      </td>

      {/* Max Points */}
      <td className="py-3 px-3 text-center w-20">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
          {item.maxPoints}
        </span>
      </td>

      {/* Score — pill selector */}
      <td className="py-3 px-3 w-52">
        <div className="flex flex-col gap-1">
          <ScorePills
            maxPoints={item.maxPoints}
            value={state.score}
            onChange={(v) => onChange(item.id, "score", v)}
            disabled={disabled}
          />
          {exceedsMax && (
            <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3" /> Max {item.maxPoints}
            </span>
          )}
        </div>
      </td>

      {/* Evidence Photo */}
      <td className="py-3 px-3 w-36">
        <EvidencePhoto
          itemId={item.id}
          photoUrl={state.photoUrl}
          onChange={(url) => onChange(item.id, "photoUrl", url)}
          disabled={disabled}
        />
      </td>

      {/* Remarks */}
      <td className="py-3 px-3 pr-4">
        <textarea
          placeholder="Remarks…"
          value={state.notes}
          onChange={(e) => onChange(item.id, "notes", e.target.value)}
          rows={2}
          disabled={disabled}
          className="w-full min-w-[140px] px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </td>
    </tr>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function InspectionChecklistPage() {
  const params = useParams<{ id: string; inspectionId: string }>();
  const router = useRouter();
  const { id: parkId, inspectionId } = params;

  const [template, setTemplate] = useState<{
    id: string;
    name: string;
    items: ChecklistItem[];
  } | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [recommendation, setRecommendation] = useState("APPROVE");
  const [motorPark, setMotorPark] = useState<any>(null);

  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);

  // Load motor park for facility photos
  useEffect(() => {
    getMotorPark(parkId).then((result) => {
      if (result.success) setMotorPark(result.data);
    });
  }, [parkId]);

  useEffect(() => {
    getInspection(inspectionId).then((inspectResult) => {
      let savedDraft: Record<
        string,
        { compliant: boolean; notes: string; photoUrl: string; score: number }
      > = {};

      if (inspectResult.success && inspectResult.data) {
        const data = inspectResult.data;
        if (data.overallAssessment) {
          const textarea = document.getElementById(
            "overallAssessment",
          ) as HTMLTextAreaElement;
          if (textarea) textarea.value = data.overallAssessment;
        }
        if (data.recommendedAction) setRecommendation(data.recommendedAction);

        for (const item of data.checklist) {
          let pUrl = "";
          if (item.photoUrls) {
            try {
              const parsed = JSON.parse(item.photoUrls);
              pUrl = Array.isArray(parsed) ? parsed[0] : parsed;
            } catch {
              pUrl = item.photoUrls;
            }
          }
          savedDraft[item.checklistItemId] = {
            compliant: item.isCompliant,
            notes: item.notes || "",
            photoUrl: pUrl,
            score: (item as any).score ?? 0,
          };
        }
      }

      getMotorParkChecklistTemplate().then((result) => {
        if (result.success && result.data) {
          setTemplate(result.data);
          const init: ChecklistState = {};
          for (const item of result.data.items) {
            init[item.id] = savedDraft[item.id] ?? {
              compliant: false,
              notes: "",
              photoUrl: "",
              score: 0,
            };
          }
          setChecklistState(init);
        } else {
          setTemplateError(
            result.success ? "No checklist template found" : result.error,
          );
        }
        setLoadingTemplate(false);
      });
    });
  }, [inspectionId]);

  function handleItemChange(
    id: string,
    field: "compliant" | "notes" | "photoUrl" | "score",
    value: boolean | string | number,
  ) {
    setChecklistState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value as any },
    }));
  }

  // Totals
  const totalMaxPoints = template?.items.reduce((sum, i) => sum + i.maxPoints, 0) ?? 0;
  const totalScore = template
    ? template.items.reduce((sum, i) => sum + (checklistState[i.id]?.score ?? 0), 0)
    : 0;
  const scorePercent = totalMaxPoints > 0 ? (totalScore / totalMaxPoints) * 100 : 0;

  const handleSaveDraft = async () => {
    setDraftSaving(true);
    setDraftSavedMessage(null);
    const checklistItems = Object.entries(checklistState).map(
      ([itemId, val]) => ({
        checklistItemId: itemId,
        isCompliant: val.compliant,
        notes: val.notes || undefined,
        photoUrls: val.photoUrl ? JSON.stringify([val.photoUrl]) : undefined,
        score: val.score,
      }),
    );
    const assessmentInput = document.getElementById(
      "overallAssessment",
    ) as HTMLTextAreaElement | null;
    const overallAssessment = assessmentInput?.value || "";
    const result = await saveInspectionDraft(
      inspectionId,
      checklistItems,
      overallAssessment,
      recommendation,
    );
    setDraftSaving(false);
    if (result.success) {
      setDraftSavedMessage("Draft saved successfully!");
      setTimeout(() => setDraftSavedMessage(null), 3000);
    } else {
      setDraftSavedMessage(`Error: ${result.error}`);
    }
  };

  const [state, action, isPending] = useActionState<SubmitState, FormData>(
    submitInspectionReport as (s: SubmitState, f: FormData) => Promise<SubmitState>,
    undefined,
  );

  useEffect(() => {
    if (state?.success) router.push(`/motor-parks/${parkId}`);
  }, [state, parkId, router]);

  const err = state && !state.success ? state.error : undefined;

  if (loadingTemplate) {
    return (
      <div className="flex flex-col gap-4 max-w-5xl">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-20 rounded-lg border border-border bg-secondary/30 animate-pulse" />
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
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Breadcrumb + Title */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/motor-parks" className="hover:text-foreground transition-colors">Motor Parks</Link>
          <span>/</span>
          <Link href={`/motor-parks/${parkId}`} className="hover:text-foreground transition-colors">Application</Link>
          <span>/</span>
          <span className="text-foreground">Inspection Report</span>
        </nav>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Evaluation of Existing Facilities
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FR-012 — Ministry of Transport physical standards checklist (AN/MOT/40/29).
          Toggle Yes/No — score will auto-suggest, or choose a pill / type a custom score.
        </p>
      </div>

      {/* Score Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-2 border-primary/20">
          <CardContent className="pt-4 pb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-muted-foreground">Total Score</span>
              <span className={`font-bold text-lg ${
                scorePercent >= 70
                  ? "text-green-600 dark:text-green-400"
                  : scorePercent >= 50
                  ? "text-amber-500"
                  : "text-destructive"
              }`}>
                {totalScore} / {totalMaxPoints}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  scorePercent >= 70
                    ? "bg-green-500"
                    : scorePercent >= 50
                    ? "bg-amber-400"
                    : "bg-destructive"
                }`}
                style={{ width: `${Math.min(scorePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {scorePercent.toFixed(1)}% — {
                scorePercent >= 70 ? "Meeting minimum standards" :
                scorePercent >= 50 ? "Partially compliant" :
                "Below minimum standards"
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Trophy className="w-4 h-4 text-primary" />
              Compliance Summary
            </div>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facilities checked Yes</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {template?.items.filter((i) => checklistState[i.id]?.compliant).length ?? 0} / {template?.items.length ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max possible score</span>
                <span className="font-bold">{totalMaxPoints}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facility Photos for Inspector Reference */}
      {motorPark?.documents && (
        <Card className="border-primary/20 bg-secondary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Uploaded Facility Infrastructure Photos
            </CardTitle>
            <CardDescription>
              Reference photos uploaded by the applicant. Verify these against the physical site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "toilet", label: "Toilet / Convenience" },
                { key: "waitingArea", label: "Waiting Lounge" },
                { key: "signage", label: "Entrance/Exit Signage" },
                { key: "waterFacility", label: "Water Supply / Borehole" },
              ].map(({ key, label }) => {
                const doc = motorPark.documents[key];
                if (!doc) return null;
                return (
                  <div key={key} className="relative group border border-border/60 rounded-lg overflow-hidden bg-background">
                    <div className="aspect-[4/3] w-full bg-muted relative">
                      <img src={doc.fileUrl} alt={label} className="object-cover w-full h-full" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                        >
                          <Eye className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                    <div className="p-2 border-t border-border/50 flex justify-between items-center">
                      <span className="text-xs font-semibold truncate">{label}</span>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5 shrink-0"
                      >
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <form
        action={(formData) => {
          formData.set("inspectionId", inspectionId);
          formData.set("recommendedAction", recommendation);
          const checklistItems = Object.entries(checklistState).map(
            ([itemId, val]) => ({
              checklistItemId: itemId,
              isCompliant: val.compliant,
              notes: val.notes || undefined,
              photoUrls: val.photoUrl ? JSON.stringify([val.photoUrl]) : undefined,
              score: val.score,
            }),
          );
          formData.set("checklistItems", JSON.stringify(checklistItems));
          return action(formData);
        }}
        noValidate
        className="flex flex-col gap-6"
      >
        {/* Checklist Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evaluation Checklist</CardTitle>
            <CardDescription>
              Toggle Yes/No for each facility — score is auto-suggested. Override via pills or custom input.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="py-2.5 pl-4 pr-2 text-[11px] font-semibold text-muted-foreground text-center w-10">S/N</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-muted-foreground text-left">Type of Facilities</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-muted-foreground text-center w-28">Yes / No</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-muted-foreground text-center w-20">Points</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-muted-foreground text-left w-52">Score</th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-muted-foreground text-left w-36">Evidence Photo</th>
                  <th className="py-2.5 px-3 pr-4 text-[11px] font-semibold text-muted-foreground text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {template?.items.map((item, idx) => (
                  <ChecklistRow
                    key={item.id}
                    sn={idx + 1}
                    item={item}
                    state={
                      checklistState[item.id] ?? {
                        compliant: false,
                        notes: "",
                        photoUrl: "",
                        score: 0,
                      }
                    }
                    onChange={handleItemChange}
                  />
                ))}
              </tbody>
              {/* Score totals row */}
              <tfoot>
                <tr className="border-t-2 border-primary/30 bg-primary/5">
                  <td colSpan={3} className="py-3 pl-4 text-xs font-bold text-foreground">
                    TOTAL
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold">
                      {totalMaxPoints}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${
                      scorePercent >= 70
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : scorePercent >= 50
                        ? "bg-amber-400/15 text-amber-700 dark:text-amber-400"
                        : "bg-destructive/15 text-destructive"
                    }`}>
                      {totalScore} pts
                    </span>
                  </td>
                  <td colSpan={2} className="py-3 px-3 pr-4 text-xs text-muted-foreground">
                    {scorePercent.toFixed(1)}% of total points scored
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

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
                name="recommendedAction"
              >
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
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/motor-parks/${parkId}`}>Cancel</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={draftSaving}
              className="gap-2"
            >
              {draftSaving ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Save className="w-4.5 h-4.5" />
              )}
              Save Draft
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {draftSavedMessage && (
              <span className="text-xs text-green-600 dark:text-green-400 font-semibold animate-pulse">
                {draftSavedMessage}
              </span>
            )}
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? "Submitting…" : "Submit Inspection Report"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
