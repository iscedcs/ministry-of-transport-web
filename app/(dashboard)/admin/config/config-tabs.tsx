"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal, Hash, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  {
    key: "controls",
    label: "Controls",
    icon: SlidersHorizontal,
    blurb: "Switch platform behaviour on and off without a deployment.",
  },
  {
    key: "fleet",
    label: "Fleet Numbering",
    icon: Hash,
    blurb: "Inspect the LV and FT sequences, and renumber a vehicle safely.",
  },
  {
    key: "advanced",
    label: "Advanced",
    icon: Wrench,
    blurb: "Raw key/value store for gateway URLs and integration metadata.",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ConfigTabs({
  controls,
  fleet,
  advanced,
}: {
  controls: ReactNode;
  fleet: ReactNode;
  advanced: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("controls");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          System Configuration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{active.blurb}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                on
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}>
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "controls" && controls}
      {tab === "fleet" && fleet}
      {tab === "advanced" && advanced}
    </div>
  );
}
