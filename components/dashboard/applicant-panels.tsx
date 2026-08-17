import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Award,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApplicantDashboard } from "@/lib/applicant-dashboard";

/**
 * The applicant's home page.
 *
 * Three questions, in the order they matter: what do I still have to do, what
 * do I hold, and what can I print? The previous version answered none of them
 * — four counters and a row of links.
 */
export function ApplicantPanels({ data }: { data: ApplicantDashboard }) {
  const { actions, holdings, documents, stats } = data;

  return (
    <div className="flex flex-col gap-8">
      {/* ── What is waiting on them ─────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Needs your attention
        </h2>

        {actions.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <span>
              Nothing outstanding. Anything the Ministry needs from you will
              appear here.
            </span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((a) => (
              <Link
                key={a.key}
                href={a.href}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-card p-4 transition-colors",
                  a.tone === "urgent"
                    ? "border-amber-500/40 hover:border-amber-500/70"
                    : "border-border hover:border-primary/60",
                )}>
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-1",
                    a.tone === "urgent" ? "bg-amber-500" : "bg-primary",
                  )}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {a.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{a.hint}</p>
                  </div>
                  {a.count != null && (
                    <span className="shrink-0 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {a.count}
                    </span>
                  )}
                </div>
                <span className="mt-3 inline-flex items-center gap-1 pl-2 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── What they hold ──────────────────────────────────────────────── */}
      {holdings.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your parks
            </h2>
            <span className="text-xs text-muted-foreground">
              {stats.staff} staff onboarded
            </span>
          </div>

          <div className="divide-y rounded-xl border">
            {holdings.map((h) => (
              <div
                key={h.key}
                className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{h.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.location ?? "Location not stated"} ·{" "}
                      {h.staffCount} staff
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {h.staffHref ? (
                    <Link
                      href={h.staffHref}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
                      <Users className="h-3.5 w-3.5" />
                      Manage staff
                    </Link>
                  ) : (
                    // Staff can only be onboarded once the park is approved,
                    // so say that rather than offering a button that fails.
                    <span className="text-xs text-muted-foreground">
                      Staff available once approved
                    </span>
                  )}
                  <Link
                    href={h.href}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
                    View <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── What they can print ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your letters &amp; certificates
        </h2>

        {documents.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <span>
              Nothing issued yet. Approval letters and certificates appear here
              the moment the Commissioner signs, ready to print or download.
            </span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((d) => (
              <Link
                key={d.key}
                href={d.href}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    d.kind === "certificate"
                      ? "bg-amber-500/10"
                      : "bg-emerald-500/10",
                  )}>
                  {d.kind === "certificate" ? (
                    <Award className="h-4 w-4 text-amber-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-emerald-500" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.subtitle}</p>
                  {d.reference && (
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/80">
                      {d.reference}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Print
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
