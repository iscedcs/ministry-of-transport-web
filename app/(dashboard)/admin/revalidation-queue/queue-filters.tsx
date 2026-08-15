"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Filter bar for the revalidation queue.
 *
 * SEARCH RUNS ON SUBMIT, NOT ON TYPING. It used to fire a debounced query on
 * every pause in typing, so "Onitsha" could cost several full-table queries
 * for one search. Typing is now free — nothing reaches the database until the
 * officer presses Enter or clicks Search.
 *
 * Status and LGA still apply immediately: those are single clicks, one query
 * each, not one per keystroke.
 *
 * Everything lives in the URL, so a filtered view can be bookmarked or sent to
 * a colleague.
 */

interface Props {
  statuses: { value: string; label: string; count: number }[];
  lgas: { value: string; count: number }[];
}

export function QueueFilters({ statuses, lgas }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  /** The query currently applied — what the results on screen reflect. */
  const applied = params.get("q") ?? "";

  /** What is in the box. Local until submitted. */
  const [term, setTerm] = useState(applied);

  // Keep the box in step when the URL changes underneath it (back/forward, or
  // "Clear filters"). Adjusting during render rather than in an effect avoids
  // a second render pass.
  const [syncedTerm, setSyncedTerm] = useState(applied);
  if (applied !== syncedTerm) {
    setSyncedTerm(applied);
    setTerm(applied);
  }

  const dirty = term.trim() !== applied;

  function push(next: URLSearchParams) {
    next.delete("page"); // any filter change returns to the first page
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  }

  /** The only thing that starts a search query. */
  function submitSearch() {
    const q = term.trim();
    if (q === applied) return; // nothing changed — do not re-query
    const next = new URLSearchParams(params.toString());
    if (q) next.set("q", q);
    else next.delete("q");
    push(next);
  }

  function clearSearch() {
    setTerm("");
    if (applied) setParam("q", null);
  }

  const status = params.get("status") ?? "";
  const lga = params.get("lga") ?? "";
  const hasFilters = Boolean(applied || status || lga);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[18rem]">
          {pending ? (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitSearch();
              }
              if (e.key === "Escape") clearSearch();
            }}
            placeholder="Search park, owner, phone, ASIN or certificate number…"
            aria-label="Search revalidation applications"
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-24 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />

          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {term && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
            {dirty && (
              <span className="hidden items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
                <CornerDownLeft className="h-3 w-3" />
                Enter
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={submitSearch}
          disabled={pending || !dirty}
          className={cn(
            "h-10 rounded-lg border px-4 text-sm font-medium transition-colors",
            dirty
              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
              : "border-border text-muted-foreground",
            "disabled:cursor-default disabled:opacity-60",
          )}>
          Search
        </button>

        <select
          value={lga}
          onChange={(e) => setParam("lga", e.target.value || null)}
          aria-label="Filter by LGA"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary">
          <option value="">All LGAs</option>
          {lgas.map((l) => (
            <option key={l.value} value={l.value}>
              {l.value} ({l.count})
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => startTransition(() => router.push(pathname))}
            className="h-10 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            Clear filters
          </button>
        )}
      </div>

      {/* What the results on screen actually reflect, so a half-typed box is
          never mistaken for an applied filter. */}
      {applied && (
        <p className="text-xs text-muted-foreground">
          Showing results for{" "}
          <span className="font-medium text-foreground">
            &ldquo;{applied}&rdquo;
          </span>
          {dirty && " — press Enter to apply your new search"}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {statuses.map((s) => {
          const active = s.value === status || (!status && s.value === "");
          return (
            <button
              key={s.value || "ALL"}
              type="button"
              onClick={() => setParam("status", s.value || null)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}>
              {s.label}
              <span className="ml-1.5 tabular-nums opacity-70">{s.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
