"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Filter bar for the revalidation queue.
 *
 * With 257 applications on the register, scrolling is not a way to find a
 * park. Search runs against name, owner, phone, ASIN and revalidation number;
 * status and LGA narrow it further. Everything lives in the URL so a filtered
 * view can be bookmarked or shared with a colleague.
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

  const urlTerm = params.get("q") ?? "";
  const [term, setTerm] = useState(urlTerm);

  // Keep the box in step when the URL changes underneath it — back/forward, or
  // "Clear filters". Adjusting during render rather than in an effect avoids a
  // second render pass (https://react.dev/learn/you-might-not-need-an-effect).
  const [syncedTerm, setSyncedTerm] = useState(urlTerm);
  if (urlTerm !== syncedTerm) {
    setSyncedTerm(urlTerm);
    setTerm(urlTerm);
  }

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

  // Debounced so a 257-row query does not run on every keystroke.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (term === current) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (term.trim()) next.set("q", term.trim());
      else next.delete("q");
      push(next);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const status = params.get("status") ?? "";
  const lga = params.get("lga") ?? "";
  const hasFilters = Boolean(term || status || lga);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[16rem]">
          {pending ? (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search park, owner, phone, ASIN or certificate number…"
            aria-label="Search revalidation applications"
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

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
