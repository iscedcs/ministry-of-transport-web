"use client";

/**
 * Tab bar shared by the four TRACAS views.
 *
 * Tabs come from lib/tracas-nav.ts, the same definition the sidebar uses, so
 * what a role sees here and what the sidebar offers can never disagree.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tracasTabsFor } from "@/lib/tracas-nav";

export function TracasNavTabs({
  role,
  /** Optional pending counts keyed by href, e.g. { "/tracas-approvals": 3 }. */
  counts,
}: {
  role: string | null;
  counts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const tabs = tracasTabsFor(role);

  // A single tab is not navigation — don't take up space showing it.
  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label="TRACAS sections"
      className="flex items-center gap-1.5 p-1 bg-secondary rounded-xl overflow-x-auto print:hidden">
      {tabs.map((tab) => {
        // /tracas is a prefix of nothing else here, but its own sub-routes
        // (/tracas/[id], /tracas/driver/...) should still mark it active.
        const active =
          tab.href === "/tracas"
            ? pathname === "/tracas" || pathname.startsWith("/tracas/")
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        const count = counts?.[tab.href] ?? 0;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              active
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}>
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
            {count > 0 && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-amber-500/15 text-amber-500"
                }`}>
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
