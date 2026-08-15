/**
 * System Monitoring Dashboard — Ministry of Transport Platform
 * STORY-087 | EPIC-005
 *
 * Real-time health overview: KPI cards + recent audit activity feed.
 * Access: PERMANENT_SECRETARY, SYSTEM_ADMIN
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  Building2,
  Bus,
  ClipboardList,
  CreditCard,
  Activity,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getSystemHealth } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateTimeShort as fmt } from "@/lib/utils/format";
import { getActionBadgeClass as actionBadgeClass } from "@/lib/utils/labels";

export default async function MonitoringPage() {
  try {
    await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN", "ADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const result = await getSystemHealth();
  const health = result.success ? result.data! : null;

  const kpis = health
    ? [
        {
          label: "Total Users",
          value: health.counts.totalUsers,
          icon: Users,
          color: "text-blue-600",
          bg: "bg-blue-100 dark:bg-blue-950/40",
        },
        {
          label: "Active Staff",
          value: health.counts.activeStaff,
          icon: UserCheck,
          color: "text-green-600",
          bg: "bg-green-100 dark:bg-green-950/40",
        },
        {
          label: "Applicants",
          value: health.counts.externalApplicants,
          icon: ShieldCheck,
          color: "text-purple-600",
          bg: "bg-purple-100 dark:bg-purple-950/40",
        },
        {
          label: "Motor Parks",
          value: health.counts.motorParks,
          icon: Building2,
          color: "text-amber-600",
          bg: "bg-amber-100 dark:bg-amber-950/40",
        },
        {
          label: "Transit Companies",
          value: health.counts.massTransitCompanies,
          icon: Bus,
          color: "text-cyan-600",
          bg: "bg-cyan-100 dark:bg-cyan-950/40",
        },
        {
          label: "Pending Inspections",
          value: health.counts.pendingInspections,
          icon: ClipboardList,
          color: "text-orange-600",
          bg: "bg-orange-100 dark:bg-orange-950/40",
        },
        {
          label: "Pending Payments",
          value: health.counts.pendingPayments,
          icon: CreditCard,
          color: "text-rose-600",
          bg: "bg-rose-100 dark:bg-rose-950/40",
        },
        {
          label: "Audit Events Today",
          value: health.counts.auditLogsToday,
          icon: Activity,
          color: "text-slate-600",
          bg: "bg-slate-100 dark:bg-slate-800/60",
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Link
            href="/admin"
            className="hover:text-foreground transition-colors">
            Admin
          </Link>
          <span>/</span>
          <span className="text-foreground">Monitoring</span>
        </nav>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}>
          System Monitoring
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live platform health overview
        </p>
      </div>

      {!health ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Unable to load system health data.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardContent className="flex items-center gap-3 pt-4 pb-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bg}`}>
                      <Icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold leading-none">
                        {kpi.value.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpi.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {health.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity.
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {health.recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionBadgeClass(log.action)}`}>
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-medium">
                            {log.entityType}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          by {log.performer}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                        {fmt(log.createdAt)}
                      </time>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-3 border-t border-border/50">
                <Link
                  href="/admin/audit"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View full audit trail →
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
