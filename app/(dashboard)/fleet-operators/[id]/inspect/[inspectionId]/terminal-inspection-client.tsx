"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitTerminalInspectionReport } from "@/app/actions/mass-transit";
import {
  TERMINAL_SECTION_TITLES,
  type ChecklistItem,
  type Verified,
} from "@/lib/terminal-checklist";

const VERDICTS: { value: Verified; label: string; tone: string }[] = [
  { value: "YES", label: "Verified", tone: "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { value: "PARTIAL", label: "Partial", tone: "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { value: "NO", label: "Not present", tone: "border-destructive/50 bg-destructive/10 text-destructive" },
];

export function TerminalInspectionClient({
  companyId,
  inspectionId,
  companyName,
  terminalLocation,
  initialChecklist,
}: {
  companyId: string;
  inspectionId: string;
  companyName: string;
  terminalLocation: string;
  initialChecklist: ChecklistItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<ChecklistItem[]>(initialChecklist);
  const [evidence, setEvidence] = useState<{ url: string; caption?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [assessment, setAssessment] = useState("");
  const [recommendation, setRecommendation] = useState("");

  const answered = items.filter((i) => i.verified != null).length;
  const failed = items.filter((i) => i.verified === "NO").length;

  function setVerdict(key: string, verified: Verified) {
    setItems((prev) =>
      prev.map((i) =>
        i.key === key ? { ...i, verified: i.verified === verified ? null : verified } : i,
      ),
    );
  }

  function setNote(key: string, note: string) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, note } : i)));
  }

  /** Evidence goes to object storage; the record keeps the URL. */
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
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
        fd.append("folder", "terminal-inspection-evidence");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json?.url) setEvidence((p) => [...p, { url: json.url, caption: file.name }]);
        else toast.error(json?.error ?? `Failed to upload ${file.name}`);
      }
    } catch {
      toast.error("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function submit() {
    if (!recommendation) return toast.error("Select a recommendation");
    if (!assessment.trim()) return toast.error("Enter your overall assessment");
    if (answered < items.length) {
      return toast.error(
        `${items.length - answered} checklist item(s) are unanswered.`,
      );
    }
    if (evidence.length === 0) {
      return toast.error("Attach at least one photograph from the site.");
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("companyId", companyId);
      fd.append("inspectionId", inspectionId);
      fd.append("overallAssessment", assessment);
      fd.append("recommendedAction", recommendation);
      fd.append("checklist", JSON.stringify(items));
      fd.append("evidenceUrls", JSON.stringify(evidence));

      const res = await submitTerminalInspectionReport(undefined, fd);
      if (res?.success) {
        toast.success("Inspection report submitted");
        router.push(`/fleet-operators/${companyId}`);
      } else {
        toast.error(res?.error ?? "Failed to submit the report");
      }
    });
  }

  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link
        href={`/fleet-operators/${companyId}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Terminal Inspection Report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {companyName}
          {terminalLocation ? ` — ${terminalLocation}` : ""}
        </p>
      </div>

      {/* Progress, so the inspector knows what is left. */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
        <span>
          <strong className="text-foreground">{answered}</strong> of{" "}
          <strong className="text-foreground">{items.length}</strong> checked
        </span>
        {failed > 0 && (
          <span className="text-destructive">
            <strong>{failed}</strong> not present
          </span>
        )}
        <span className="text-muted-foreground">
          {evidence.length} photograph{evidence.length === 1 ? "" : "s"} attached
        </span>
      </div>

      {sections.map((sec) => (
        <Card key={sec}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Section {sec} — {TERMINAL_SECTION_TITLES[sec] ?? ""}
            </CardTitle>
            <CardDescription>
              Mark each item as you verify it on site.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {items
              .filter((i) => i.section === sec)
              .map((item) => (
                <div key={item.key} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.declared}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {VERDICTS.map((v) => (
                        <button
                          key={v.value}
                          type="button"
                          onClick={() => setVerdict(item.key, v.value)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
                            item.verified === v.value
                              ? v.tone
                              : "border-border text-muted-foreground hover:bg-secondary",
                          )}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(item.verified === "NO" || item.verified === "PARTIAL") && (
                    <input
                      value={item.note ?? ""}
                      onChange={(e) => setNote(item.key, e.target.value)}
                      placeholder="What did you observe?"
                      className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      {/* Evidence */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Site photographs
          </CardTitle>
          <CardDescription>
            At least one is required. Include the camera installation, the
            premises and the fleet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={upload}
            disabled={uploading}
            className="text-sm"
          />
          {uploading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
            </p>
          )}
          {evidence.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {evidence.map((ev, i) => (
                <div key={ev.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ev.url}
                    alt={ev.caption ?? "Site evidence"}
                    className="h-24 w-full rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEvidence((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-white"
                    aria-label="Remove">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment and recommendation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Findings</CardTitle>
          <CardDescription>
            Your overall assessment and recommendation to the HOD.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <textarea
            rows={5}
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            placeholder="Describe the terminal premises, fleet condition and any issues found…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Recommendation <span className="text-destructive">*</span>
            </label>
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select recommendation</option>
              <option value="APPROVE">Approve</option>
              <option value="CONDITIONAL">Conditional — issues to correct</option>
              <option value="REJECT">Reject</option>
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Approve or Conditional advances to the HOD. Reject returns the
              application to the operator.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={submit} disabled={isPending || uploading}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit report
            </Button>
            <Button asChild variant="outline">
              <Link href={`/fleet-operators/${companyId}`}>Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
