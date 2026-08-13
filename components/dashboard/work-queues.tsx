import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleDashboard, Tone } from "@/lib/role-dashboard";

/**
 * "Needs your attention" — the first thing a member of staff sees.
 *
 * Every card is a link into the queue it counts, so nothing requires the
 * viewer to already know which sidebar item hides their work.
 */

const TONES: Record<Tone, { ring: string; badge: string; bar: string }> = {
  urgent: {
    ring: "border-amber-500/40 hover:border-amber-500/70",
    badge: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  action: {
    ring: "border-border hover:border-primary/60",
    badge: "text-foreground",
    bar: "bg-primary",
  },
  info: {
    ring: "border-border/60 hover:border-border",
    badge: "text-muted-foreground",
    bar: "bg-muted-foreground/40",
  },
};

export function WorkQueues({ data }: { data: RoleDashboard }) {
  const { actions, overview } = data;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Needs your attention
          </h2>
          {actions.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {actions.reduce((n, a) => n + a.count, 0)} item
              {actions.reduce((n, a) => n + a.count, 0) === 1 ? "" : "s"} across{" "}
              {actions.length} queue{actions.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {actions.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>
              Nothing is waiting on you right now. New work will appear here as
              soon as it reaches your stage.
            </span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((a) => {
              const tone = TONES[a.tone];
              return (
                <Link
                  key={a.key}
                  href={a.href}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border bg-card p-4 transition-colors",
                    tone.ring,
                  )}>
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 w-1",
                      tone.bar,
                    )}
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-3 pl-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {a.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.hint}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-2xl font-bold tabular-nums",
                        tone.badge,
                      )}>
                      {a.count}
                    </span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 pl-2 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open queue <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {overview.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            At a glance
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overview.map((o) => (
              <Link
                key={o.key}
                href={o.href}
                className="rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:border-border">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {o.count}
                </p>
                <p className="mt-1 text-xs font-medium text-foreground">
                  {o.label}
                </p>
                <p className="text-xs text-muted-foreground">{o.hint}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
