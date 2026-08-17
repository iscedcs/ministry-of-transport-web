"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  MinusCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { submitRevalidationFindings } from "@/app/actions/revalidation-workflow";
import {
  SECTION_TITLES,
  type ChecklistItem,
  type Verified,
} from "@/lib/revalidation-checklist";

const VERDICTS: { value: Verified; label: string; className: string }[] = [
  {
    value: "YES",
    label: "Verified",
    className:
      "data-[on=true]:bg-emerald-500/15 data-[on=true]:text-emerald-500 data-[on=true]:border-emerald-500/40",
  },
  {
    value: "PARTIAL",
    label: "Partial",
    className:
      "data-[on=true]:bg-amber-500/15 data-[on=true]:text-amber-500 data-[on=true]:border-amber-500/40",
  },
  {
    value: "N_A",
    label: "N/A",
    className:
      "data-[on=true]:bg-slate-500/15 data-[on=true]:text-slate-400 data-[on=true]:border-slate-500/40",
  },
  {
    value: "NO",
    label: "Not found",
    className:
      "data-[on=true]:bg-red-500/15 data-[on=true]:text-red-500 data-[on=true]:border-red-500/40",
  },
];

export function InspectionClient({
  applicationId,
  parkName,
  ownerName,
  location,
  facilityType,
  status,
  inspectionDate,
  initialChecklist,
  initialFindings,
  initialRecommendation,
  isAssignedInspector,
}: {
  applicationId: string;
  parkName: string;
  ownerName: string;
  location: string;
  facilityType: string | null;
  status: string;
  inspectionDate: Date | null;
  initialChecklist: ChecklistItem[];
  initialFindings: string;
  initialRecommendation: string;
  isAssignedInspector: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState<ChecklistItem[]>(initialChecklist);
  const [findings, setFindings] = useState(initialFindings);
  const [recommendation, setRecommendation] = useState(initialRecommendation);
  const [evidence, setEvidence] = useState<{ url: string; caption?: string }[]>(
    [],
  );
  const [uploading, setUploading] = useState(false);

  const answered = items.filter((i) => i.verified !== null).length;
  const complete = answered === items.length;

  const grouped = useMemo(() => {
    const map = new Map<ChecklistItem["section"], ChecklistItem[]>();
    for (const item of items) {
      map.set(item.section, [...(map.get(item.section) ?? []), item]);
    }
    return map;
  }, [items]);

  const setVerdict = (key: string, verified: Verified) =>
    setItems((prev) =>
      prev.map((i) =>
        i.key === key
          ? { ...i, verified: i.verified === verified ? null : verified }
          : i,
      ),
    );

  const setNote = (key: string, note: string) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, note } : i)));

  const isImage = (url: string) => /\.(png|jpe?g|webp|gif|avif)$/i.test(url);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5MB.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "revalidation-evidence");
        fd.append("linkedToType", "REVALIDATION");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json?.url) {
          setEvidence((p) => [...p, { url: json.url, caption: file.name }]);
        } else {
          toast.error(json?.error ?? `Failed to upload ${file.name}`);
        }
      }
    } catch {
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = () => {
    if (!complete) {
      return toast.error(
        `Answer every checklist item — ${items.length - answered} remaining.`,
      );
    }
    if (!findings.trim()) return toast.error("Enter your overall findings.");
    if (!recommendation) return toast.error("Select a recommendation.");
    if (evidence.length === 0)
      return toast.error("Upload at least one piece of site evidence.");

    startTransition(async () => {
      const res = await submitRevalidationFindings(
        applicationId,
        findings,
        recommendation,
        evidence,
        items,
      );
      if (res.success) {
        toast.success("Inspection submitted to the HOD");
        router.push(`/admin/revalidation-queue/${applicationId}`);
      } else {
        toast.error(res.error ?? "Failed to submit inspection");
      }
    });
  };

  const readOnly = status !== "INSPECTION_SCHEDULED";

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      <div>
        <Link
          href={`/admin/revalidation-queue/${applicationId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to application
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{parkName}</h1>
          {facilityType && (
            <Badge variant="outline" className="font-semibold">
              {facilityType}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {ownerName} · {location || "Location not recorded"}
          {inspectionDate
            ? ` · Scheduled ${new Date(inspectionDate).toLocaleDateString("en-GB")}`
            : ""}
        </p>
      </div>

      {readOnly && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm">
          This inspection is not open for editing — the application is at{" "}
          <span className="font-semibold">{status}</span>.
        </div>
      )}
      {!readOnly && !isAssignedInspector && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm">
          You are not the assigned inspection officer. Submitting will be
          recorded against your account as a supervisory override.
        </div>
      )}

      {/* Progress */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Verification progress
              </p>
              <p className="text-xs text-muted-foreground">
                Compare each declared item against what you find on site.
              </p>
            </div>
          </div>
          <span
            className={`text-sm font-bold ${complete ? "text-emerald-500" : "text-amber-500"}`}>
            {answered} / {items.length}
          </span>
        </CardContent>
      </Card>

      {/* Checklist */}
      {[...grouped.entries()].map(([section, sectionItems]) => (
        <Card key={section} className="bg-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">
              {SECTION_TITLES[section]}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/50">
              {sectionItems.map((item) => (
                <li key={item.key} className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Applicant declared:{" "}
                        <span className="text-foreground">{item.declared}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {VERDICTS.map((v) => (
                        <button
                          key={v.value}
                          type="button"
                          disabled={readOnly}
                          data-on={item.verified === v.value}
                          onClick={() => setVerdict(item.key, v.value)}
                          className={`rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${v.className}`}>
                          {v.value === "YES" && (
                            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                          )}
                          {v.value === "PARTIAL" && (
                            <MinusCircle className="w-3.5 h-3.5 inline mr-1" />
                          )}
                          {v.value === "NO" && (
                            <XCircle className="w-3.5 h-3.5 inline mr-1" />
                          )}
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* A note is where a discrepancy gets explained */}
                  {item.verified && item.verified !== "YES" && (
                    <Input
                      value={item.note ?? ""}
                      disabled={readOnly}
                      onChange={(e) => setNote(item.key, e.target.value)}
                      placeholder="What did you find? (required context for the HOD)"
                      className="mt-3 text-sm"
                    />
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Evidence */}
      <Card className="bg-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            Site Evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            disabled={readOnly || uploading || isPending}
            onChange={handleUpload}
            className="block w-full text-sm cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-semibold"
          />
          <p className="text-xs text-muted-foreground">
            Photographs or documents captured on site. Images or PDF, under 5MB
            each.
          </p>
          {uploading && <p className="text-xs text-primary">Uploading…</p>}

          {evidence.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {evidence.map((ev, i) => (
                <div
                  key={ev.url}
                  className="relative rounded-xl border border-border overflow-hidden bg-secondary/40 group">
                  {isImage(ev.url) ? (
                    <img
                      src={ev.url}
                      alt={ev.caption ?? "Evidence"}
                      className="w-full h-28 object-cover"
                    />
                  ) : (
                    <div className="w-full h-28 flex items-center justify-center text-xs text-muted-foreground px-2 text-center">
                      {ev.caption ?? "Document"}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setEvidence((p) => p.filter((_, j) => j !== i))
                    }
                    className="absolute top-1.5 right-1.5 rounded-lg bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[10px] text-muted-foreground truncate px-2 py-1">
                    {ev.caption}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Findings &amp; Recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Overall findings *</label>
            <textarea
              value={findings}
              disabled={readOnly}
              onChange={(e) => setFindings(e.target.value)}
              rows={5}
              placeholder="Summarise the site visit and anything the HOD should weigh."
              className="w-full rounded-xl border border-border bg-background/50 p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Recommendation *</label>
            <select
              value={recommendation}
              disabled={readOnly}
              onChange={(e) => setRecommendation(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">-- Select --</option>
              <option value="APPROVE">Recommend approval</option>
              <option value="CONDITIONAL">
                Recommend approval with conditions
              </option>
              <option value="REJECT">Recommend rejection</option>
            </select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={readOnly || isPending || uploading}
            className="w-full sm:w-auto cursor-pointer">
            {isPending ? "Submitting..." : "Submit to HOD"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
