"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  X,
  Building2,
  Bus,
  Building,
  FileCheck,
  Layers,
  MapPin,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ExecutiveLetterQueueData,
  ExecutiveApprovalItem,
  ExecutiveLetterModule,
} from "@/app/actions/letter-approvals";

const MODULE_TABS: {
  key: "ALL" | ExecutiveLetterModule;
  label: string;
  icon: typeof Bus;
  countKey?: keyof ExecutiveLetterQueueData["counts"];
}[] = [
  { key: "ALL", label: "All Letters", icon: Layers, countKey: "totalPending" },
  {
    key: "MOTOR_PARK",
    label: "Motor Parks",
    icon: Building2,
    countKey: "motorParks",
  },
  {
    key: "MASS_TRANSIT",
    label: "Mass Transit",
    icon: Bus,
    countKey: "massTransit",
  },
  { key: "TERMINAL", label: "Terminals", icon: Building, countKey: "terminals" },
  {
    key: "REVALIDATION",
    label: "Revalidations",
    icon: FileCheck,
    countKey: "revalidations",
  },
  { key: "TRACAS", label: "TRACAS Authority", icon: Bus, countKey: "tracas" },
];

export function LetterApprovalsClient({
  data,
  role,
  initialQuery = "",
  initialModule = "ALL",
}: {
  data: ExecutiveLetterQueueData;
  role: string;
  initialQuery?: string;
  initialModule?: string;
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedModule, setSelectedModule] = useState<"ALL" | ExecutiveLetterModule>(
    (initialModule as "ALL" | ExecutiveLetterModule) || "ALL",
  );
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  const { items = [], counts } = data;

  const stageLabel =
    role === "COMMISSIONER"
      ? "Letters and permits awaiting your final approval and signature as Honourable Commissioner"
      : role === "PERMANENT_SECRETARY"
        ? "Letters and inspection schedules awaiting your review and clearance as Permanent Secretary"
        : "Centralized Ministry queue for regulatory letters, permits, and certificates";

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      // 1. Module filter
      if (selectedModule !== "ALL" && item.module !== selectedModule) {
        return false;
      }

      // 2. Stage filter
      if (stageFilter !== "ALL") {
        if (
          stageFilter === "COMMISSIONER" &&
          !item.status.includes("COMMISSIONER") &&
          item.status !== "PENDING_APPROVAL"
        )
          return false;
        if (stageFilter === "PS" && !item.status.includes("PS")) return false;
        if (stageFilter === "MD" && !item.status.includes("MD")) return false;
      }

      // 3. Search query
      if (!q) return true;

      const searchableFields = [
        item.title,
        item.subtitle,
        item.reference,
        item.applicantOrOwner,
        item.contactPhone ?? "",
        item.lgaOrLocation ?? "",
        item.status,
        item.stageLabel,
        item.module,
      ]
        .join(" ")
        .toLowerCase();

      return searchableFields.includes(q);
    });
  }, [items, searchQuery, selectedModule, stageFilter]);

  return (
    <div className="space-y-8 py-2 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              Letter Approvals Center
            </h1>
            {counts.totalPending > 0 && (
              <Badge className="bg-primary/15 text-primary border-primary/25 font-bold">
                {counts.totalPending} pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{stageLabel}</p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Pending"
          value={counts.totalPending}
          icon={<Layers className="w-4 h-4 text-primary" />}
          tint="bg-primary/10"
          highlight={selectedModule === "ALL"}
          onClick={() => setSelectedModule("ALL")}
        />
        <StatCard
          label="Motor Parks"
          value={counts.motorParks}
          icon={<Building2 className="w-4 h-4 text-emerald-500" />}
          tint="bg-emerald-500/10"
          highlight={selectedModule === "MOTOR_PARK"}
          onClick={() => setSelectedModule("MOTOR_PARK")}
        />
        <StatCard
          label="Mass Transit"
          value={counts.massTransit}
          icon={<Bus className="w-4 h-4 text-amber-500" />}
          tint="bg-amber-500/10"
          highlight={selectedModule === "MASS_TRANSIT"}
          onClick={() => setSelectedModule("MASS_TRANSIT")}
        />
        <StatCard
          label="Terminals"
          value={counts.terminals}
          icon={<Building className="w-4 h-4 text-cyan-500" />}
          tint="bg-cyan-500/10"
          highlight={selectedModule === "TERMINAL"}
          onClick={() => setSelectedModule("TERMINAL")}
        />
        <StatCard
          label="Revalidations"
          value={counts.revalidations}
          icon={<FileCheck className="w-4 h-4 text-blue-500" />}
          tint="bg-blue-500/10"
          highlight={selectedModule === "REVALIDATION"}
          onClick={() => setSelectedModule("REVALIDATION")}
        />
        <StatCard
          label="TRACAS Letters"
          value={counts.tracas}
          icon={<Bus className="w-4 h-4 text-purple-500" />}
          tint="bg-purple-500/10"
          highlight={selectedModule === "TRACAS"}
          onClick={() => setSelectedModule("TRACAS")}
        />
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Universal Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchQuery("");
              }}
              placeholder="Search by park, company, vehicle reg, driver, owner, LGA, or ref code..."
              className="pl-10 pr-9 bg-card border-border/70 rounded-xl h-10 text-sm placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-md">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Stage Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              aria-label="Filter by approval stage"
              className="h-10 px-3 text-xs font-medium rounded-xl border border-border/70 bg-card text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="ALL">All Approval Stages</option>
              <option value="COMMISSIONER">Awaiting Commissioner</option>
              <option value="PS">Awaiting PS</option>
              <option value="MD">Awaiting MD</option>
            </select>

            {(searchQuery || selectedModule !== "ALL" || stageFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedModule("ALL");
                  setStageFilter("ALL");
                }}
                className="h-10 text-xs text-muted-foreground hover:text-foreground">
                Reset filters
              </Button>
            )}
          </div>
        </div>

        {/* Module Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-2">
          {MODULE_TABS.map((tab) => {
            const count = tab.countKey ? counts[tab.countKey] : 0;
            const isActive = selectedModule === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedModule(tab.key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/80 text-foreground"
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Action Queue Card ─────────────────────────────────────────────────── */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <span>Letters Awaiting Action</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {filteredItems.length}
                  {searchQuery && ` of ${items.length}`}
                </Badge>
              </h2>
              {searchQuery && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Filtering for &quot;{searchQuery}&quot;
                </p>
              )}
            </div>

            {searchQuery && (
              <span className="text-xs text-muted-foreground">
                Showing {filteredItems.length} matching result
                {filteredItems.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="p-3 rounded-full bg-muted/30 text-muted-foreground">
                <Search className="w-6 h-6" />
              </div>
              {searchQuery || selectedModule !== "ALL" || stageFilter !== "ALL" ? (
                <>
                  <p className="font-medium text-foreground">
                    No letters match your search criteria
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Try checking the spelling or search by park name, operator
                    name, driver, reference, or LGA.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedModule("ALL");
                      setStageFilter("ALL");
                    }}
                    className="mt-2 text-xs">
                    Clear search & filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">
                    Nothing awaiting approval
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All caught up. New approval letters will appear here as soon
                    as they reach your stage.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {filteredItems.map((item) => (
                <ExecutiveLetterRow key={`${item.module}-${item.id}`} item={item} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExecutiveLetterRow({ item }: { item: ExecutiveApprovalItem }) {
  const { module } = item;

  const moduleConfig: Record<
    ExecutiveLetterModule,
    { label: string; badgeClass: string; icon: typeof Bus }
  > = {
    MOTOR_PARK: {
      label: "Motor Park",
      badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      icon: Building2,
    },
    MASS_TRANSIT: {
      label: "Mass Transit",
      badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      icon: Bus,
    },
    TERMINAL: {
      label: "Terminal",
      badgeClass: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      icon: Building,
    },
    REVALIDATION: {
      label: "Revalidation",
      badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      icon: FileCheck,
    },
    TRACAS: {
      label: "TRACAS",
      badgeClass: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      icon: Bus,
    },
  };

  const cfg = moduleConfig[module] || moduleConfig.MOTOR_PARK;
  const ModuleIcon = cfg.icon;

  return (
    <li className="p-4 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-muted/15 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Module tag */}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.badgeClass}`}>
            <ModuleIcon className="w-3 h-3" />
            {cfg.label}
          </span>

          {/* Primary title */}
          <span className="font-bold text-foreground">{item.title}</span>

          {/* Reference pill */}
          {item.reference && (
            <Badge variant="outline" className="text-[10px] font-mono">
              {item.reference}
            </Badge>
          )}

          {/* Status badge */}
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
            {item.stageLabel}
          </Badge>
        </div>

        {/* Secondary description */}
        <p className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>{item.subtitle}</span>
          {item.applicantOrOwner && (
            <>
              <span className="text-border">·</span>
              <span>{item.applicantOrOwner}</span>
            </>
          )}
        </p>

        {/* Location or Extra details */}
        {item.lgaOrLocation && (
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground/70" />
            <span>{item.lgaOrLocation}</span>
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href={item.reviewUrl}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <FileText className="w-3.5 h-3.5" />
          {module === "MOTOR_PARK"
            ? "Review & Approve"
            : module === "MASS_TRANSIT"
              ? "Review & Issue Permit"
              : module === "TERMINAL"
                ? "Review Terminal"
                : module === "REVALIDATION"
                  ? "Review Certificate"
                  : "Review Letter"}
        </Link>
      </div>
    </li>
  );
}

function StatCard({
  label,
  value,
  icon,
  tint,
  highlight,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tint: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`bg-card transition-all ${
        onClick ? "cursor-pointer hover:border-primary/50" : ""
      } ${
        highlight
          ? "border-primary/60 ring-1 ring-primary/40 shadow-sm"
          : "border-border/60"
      }`}>
      <CardContent className="p-3.5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <h3 className="text-xl font-bold text-foreground mt-0.5">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${tint}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}
