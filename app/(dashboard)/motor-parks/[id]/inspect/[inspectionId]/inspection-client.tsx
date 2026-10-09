"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitInspectionReport, type ProximityEvaluationInput } from "@/app/actions/motor-park";
import {
  buildTerminalChecklist,
  TERMINAL_SECTION_TITLES,
  type ChecklistItem,
  type Verified,
  type TerminalDeclarations,
} from "@/lib/terminal-checklist";

function declaredFacilities(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, claimed]) => claimed === true)
    .map(([facility]) => facility);
}

export default function InspectionReportClient({
  parkId,
  parkName,
  facilitiesAvailable,
  declarations,
}: {
  parkId: string;
  inspectionId: string;
  parkName: string;
  facilitiesAvailable: unknown;
  declarations: TerminalDeclarations;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialChecklist = useMemo(
    () => buildTerminalChecklist(declaredFacilities(facilitiesAvailable), declarations),
    [facilitiesAvailable, declarations],
  );
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [findings, setFindings] = useState("");
  const [evidence, setEvidence] = useState<{ url: string; caption?: string }[]>([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);

  // Proximity evaluation — folded in here so it is recorded once, with the
  // checklist, instead of a separate step after the report is already filed.
  const [nearPublicPark, setNearPublicPark] = useState<"yes" | "no" | "">("");
  const [publicParkDistanceM, setPublicParkDistanceM] = useState("");
  const [nearMajorRoad, setNearMajorRoad] = useState<"yes" | "no" | "">("");
  const [majorRoadDistanceM, setMajorRoadDistanceM] = useState("");
  const [nearIntersection, setNearIntersection] = useState<"yes" | "no" | "">("");
  const [intersectionDistanceM, setIntersectionDistanceM] = useState("");
  const [proximityVerdict, setProximityVerdict] = useState<
    "" | "PASS" | "CONDITIONAL" | "FAIL"
  >("");
  const [proximityNotes, setProximityNotes] = useState("");

  const setVerdict = (key: string, verified: Verified) => {
    setChecklist((prev) =>
      prev.map((i) => (i.key === key ? { ...i, verified } : i)),
    );
  };

  const uploadEvidence = async (files: File[]) => {
    setEvidenceUploading(true);
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5MB.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "motor-park-evidence");
        fd.append("linkedToType", "MOTOR_PARK");
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
      setEvidenceUploading(false);
    }
  };

  const submit = () => {
    const unanswered = checklist.filter((i) => i.verified === null).length;
    if (unanswered > 0) {
      toast.error(`${unanswered} checklist item(s) unanswered.`);
      return;
    }
    if (!findings.trim()) {
      toast.error("Record what was found at the site.");
      return;
    }
    if (evidence.length === 0) {
      toast.error("Upload at least one piece of site evidence.");
      return;
    }
    if (!nearPublicPark || !nearMajorRoad || !nearIntersection) {
      toast.error("Answer all three proximity factors.");
      return;
    }
    if (!proximityVerdict) {
      toast.error("Record the proximity verdict.");
      return;
    }

    const proximity: ProximityEvaluationInput = {
      nearPublicPark: nearPublicPark === "yes",
      publicParkDistanceM: publicParkDistanceM ? Number(publicParkDistanceM) : null,
      nearMajorRoad: nearMajorRoad === "yes",
      majorRoadDistanceM: majorRoadDistanceM ? Number(majorRoadDistanceM) : null,
      nearIntersection: nearIntersection === "yes",
      intersectionDistanceM: intersectionDistanceM ? Number(intersectionDistanceM) : null,
      verdict: proximityVerdict,
      notes: proximityNotes,
    };

    startTransition(async () => {
      const res = await submitInspectionReport(parkId, {
        findings,
        checklist,
        evidenceUrls: evidence,
        proximity,
      });
      if (res.success) {
        toast.success("Inspection report filed.");
        router.push(`/motor-parks/${parkId}`);
      } else {
        toast.error(res.error || "Could not file the report.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <Link
        href={`/motor-parks/${parkId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to {parkName}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inspection Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every item is answered. &quot;Not stated&quot; on a declaration is a finding in
          itself — verify it, do not skip it. Use N/A when an item does not apply.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
          <CardDescription>Declared vs. found, item by item.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Object.entries(TERMINAL_SECTION_TITLES).map(([section, title]) => {
            const items = checklist.filter((i) => i.section === section);
            if (items.length === 0) return null;
            return (
              <div key={section} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {title}
                </p>
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Declared: {item.declared}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {(["YES", "PARTIAL", "NO", "N_A"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVerdict(item.key, v)}
                            className={cn(
                              "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                              item.verified === v
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:bg-secondary",
                            )}>
                            {v === "N_A" ? "N/A" : v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proximity Evaluation</CardTitle>
          <CardDescription>
            Recorded once, here, instead of a separate step afterwards. A FAIL is a
            finding HOD Operations weighs — it does not reject the application on its own.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(
            [
              {
                label: "Proximity to an existing public park",
                value: nearPublicPark,
                set: setNearPublicPark,
                distance: publicParkDistanceM,
                setDistance: setPublicParkDistanceM,
              },
              {
                label: "Proximity to a major transport route / public road",
                value: nearMajorRoad,
                set: setNearMajorRoad,
                distance: majorRoadDistanceM,
                setDistance: setMajorRoadDistanceM,
              },
              {
                label: "Proximity to a major road intersection",
                value: nearIntersection,
                set: setNearIntersection,
                distance: intersectionDistanceM,
                setDistance: setIntersectionDistanceM,
              },
            ] as const
          ).map((factor) => (
            <div key={factor.label} className="rounded-lg border border-border px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">{factor.label}</p>
                <div className="flex gap-1">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => factor.set(v)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                        factor.value === v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-secondary",
                      )}>
                      {v === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
              {factor.value === "yes" && (
                <input
                  type="number"
                  min={0}
                  value={factor.distance}
                  onChange={(e) => factor.setDistance(e.target.value)}
                  placeholder="Approximate distance (metres)"
                  className="mt-2 w-48 rounded-md border border-border bg-background px-2 py-1 text-xs"
                />
              )}
            </div>
          ))}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Overall proximity verdict
            </span>
            <select
              value={proximityVerdict}
              onChange={(e) =>
                setProximityVerdict(e.target.value as "" | "PASS" | "CONDITIONAL" | "FAIL")
              }
              className="h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select verdict</option>
              <option value="PASS">PASS - site is suitable</option>
              <option value="CONDITIONAL">CONDITIONAL - suitable with conditions</option>
              <option value="FAIL">FAIL - site not suitable</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Proximity notes (optional)
            </span>
            <textarea
              rows={2}
              value={proximityNotes}
              onChange={(e) => setProximityNotes(e.target.value)}
              placeholder="Describe the proximity findings and any conditions."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Findings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <textarea
            rows={4}
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="What was found at the site."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Camera className="h-3.5 w-3.5" />
              Site evidence (required)
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              disabled={evidenceUploading || isPending}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length > 0) uploadEvidence(files);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Photographs or documents captured on site. Images or PDF, under 5MB each.
            </p>
            {evidenceUploading && <p className="text-xs text-primary">Uploading...</p>}
            {evidence.length > 0 && (
              <ul className="flex flex-col gap-1">
                {evidence.map((ev, i) => (
                  <li
                    key={ev.url}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs">
                    <span className="truncate">{ev.caption ?? "Evidence"}</span>
                    <button
                      type="button"
                      onClick={() => setEvidence((p) => p.filter((_, j) => j !== i))}
                      className="ml-2 text-destructive">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => router.push(`/motor-parks/${parkId}`)} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={isPending || evidenceUploading}>
          {isPending ? "Filing..." : "File report"}
        </Button>
      </div>
    </div>
  );
}
