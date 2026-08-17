import { CheckCircle2, AlertCircle, HelpCircle, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TERMINAL_SECTION_TITLES,
  parseTerminalChecklist,
  checklistSummary,
} from "@/lib/terminal-checklist";

/**
 * The inspector's findings, as the HOD needs to read them.
 *
 * The detail page previously showed a recommendation badge and two clamped
 * lines of prose — a verdict with nothing behind it. This renders what was
 * actually checked, what failed, the notes against each failure, and the
 * photographs taken on site.
 */

interface Props {
  overallAssessment: string | null;
  recommendedAction: string | null;
  inspectionChecklist: unknown;
  evidenceUrls: unknown;
  inspectorName?: string;
  completedAt?: Date | string | null;
}

function parseEvidence(raw: unknown): { url: string; caption?: string }[] {
  const arr = typeof raw === "string" ? safeParse(raw) : raw;
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (x): x is { url: string; caption?: string } =>
      !!x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string",
  );
}

function safeParse(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

const VERDICT = {
  YES: {
    label: "Verified",
    icon: CheckCircle2,
    cls: "text-emerald-600 dark:text-emerald-400",
  },
  PARTIAL: {
    label: "Partial",
    icon: AlertCircle,
    cls: "text-amber-600 dark:text-amber-400",
  },
  NO: {
    label: "Not present",
    icon: AlertCircle,
    cls: "text-destructive",
  },
} as const;

export function TerminalInspectionFindings({
  overallAssessment,
  recommendedAction,
  inspectionChecklist,
  evidenceUrls,
  inspectorName,
  completedAt,
}: Props) {
  const items = parseTerminalChecklist(inspectionChecklist);
  const evidence = parseEvidence(evidenceUrls);
  const summary = checklistSummary(items);

  const nothingFiled =
    items.length === 0 && evidence.length === 0 && !overallAssessment;

  if (nothingFiled) {
    return (
      <p className="text-sm text-muted-foreground">
        The inspector has not filed a report for this inspection yet.
      </p>
    );
  }

  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <div className="flex flex-col gap-4">
      {/* Headline — what the HOD weighs the decision against. */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <strong>{summary.verified}</strong> verified
          </span>
          {summary.partial > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <strong>{summary.partial}</strong> partial
            </span>
          )}
          {summary.failed > 0 && (
            <span className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <strong>{summary.failed}</strong> not present
            </span>
          )}
          {summary.unanswered > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <strong>{summary.unanswered}</strong> unanswered
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {inspectorName}
            {completedAt
              ? ` · ${new Date(completedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`
              : ""}
          </span>
        </div>
      )}

      {recommendedAction && (
        <div
          className={cn(
            "rounded-lg border px-4 py-2.5 text-sm font-semibold",
            recommendedAction === "APPROVE" &&
              "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
            recommendedAction === "CONDITIONAL" &&
              "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
            recommendedAction === "REJECT" &&
              "border-destructive/30 bg-destructive/5 text-destructive",
          )}>
          Inspector recommends: {recommendedAction}
        </div>
      )}

      {/* The checklist, in full — not clamped. */}
      {sections.map((sec) => (
        <div key={sec}>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Section {sec} — {TERMINAL_SECTION_TITLES[sec] ?? ""}
          </p>
          <div className="divide-y rounded-lg border">
            {items
              .filter((i) => i.section === sec)
              .map((item) => {
                const v = item.verified ? VERDICT[item.verified] : null;
                const Icon = v?.icon ?? HelpCircle;
                return (
                  <div key={item.key} className="px-3 py-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 flex-1">{item.label}</span>
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 text-xs font-semibold",
                          v?.cls ?? "text-muted-foreground",
                        )}>
                        <Icon className="h-3.5 w-3.5" />
                        {v?.label ?? "Not stated"}
                      </span>
                    </div>
                    {item.note && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.note}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {overallAssessment && (
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Overall assessment
          </p>
          <p className="whitespace-pre-wrap rounded-lg border bg-secondary/40 p-3 text-sm leading-relaxed">
            {overallAssessment}
          </p>
        </div>
      )}

      {evidence.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Camera className="h-3.5 w-3.5" />
            Site photographs ({evidence.length})
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {evidence.map((ev) => (
              <a
                key={ev.url}
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ev.url}
                  alt={ev.caption ?? "Site evidence"}
                  className="h-24 w-full rounded-lg border object-cover transition-opacity group-hover:opacity-80"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
