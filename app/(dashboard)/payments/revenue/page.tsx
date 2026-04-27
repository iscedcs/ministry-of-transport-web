/**
 * Revenue Report Page — Ministry of Transport Platform
 * STORY-067 | EPIC-004 | FR-043
 *
 * Aggregate revenue statistics for the Ministry Finance team.
 * Shows totals, breakdown by payment type, and monthly trend.
 *
 * Access: FINANCE_OFFICER, COMMISSIONER, PERMANENT_SECRETARY, SYSTEM_ADMIN
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, TrendingUp, BarChart3, DollarSign } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getRevenueStats } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNaira as naira, fmtMonthLabel as monthLabel } from "@/lib/utils/format";

export default async function RevenuePage() {
  try {
    await requireRole([
      "FINANCE_OFFICER",
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "SYSTEM_ADMIN",
    ]);
  } catch {
    redirect("/dashboard");
  }

  const result = await getRevenueStats();
  const stats = result.success
    ? result.data!
    : {
        totalCollectedKobo: 0,
        totalPendingKobo: 0,
        totalRefundedKobo: 0,
        transactionCount: 0,
        byType: [],
        byMonth: [],
      };

  const maxMonthly = Math.max(...stats.byMonth.map((m) => m.totalKobo), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link
            href="/payments"
            className="hover:text-foreground transition-colors">
            Payments
          </Link>
          <span>/</span>
          <span className="text-foreground">Revenue Report</span>
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/payments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}>
              Revenue Report
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              All-time Ministry of Transport fee collection summary
            </p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          label="Total Collected"
          value={naira(stats.totalCollectedKobo)}
          bg="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
          label="Pending"
          value={naira(stats.totalPendingKobo)}
          bg="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        />
        <KpiCard
          icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
          label="Transactions"
          value={stats.transactionCount.toLocaleString()}
          bg="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
          label="Refunded"
          value={naira(stats.totalRefundedKobo)}
          bg="bg-secondary border-border"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue by payment type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">By Payment Type</CardTitle>
            <CardDescription>
              Breakdown of completed transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byType.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No completed payments yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {stats.byType
                  .sort((a, b) => b.totalKobo - a.totalKobo)
                  .map((t) => {
                    const pct =
                      stats.totalCollectedKobo > 0
                        ? Math.round(
                            (t.totalKobo / stats.totalCollectedKobo) * 100,
                          )
                        : 0;
                    return (
                      <div key={t.paymentType} className="flex flex-col gap-1">
                        <div className="flex justify-between text-sm">
                          <span>{t.paymentType.replace(/_/g, " ")}</span>
                          <span className="font-semibold tabular-nums">
                            {naira(t.totalKobo)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.count} transaction{t.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly trend (last 12 months) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Monthly Trend</CardTitle>
            <CardDescription>
              Collected revenue over the last 12 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No data to display.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.byMonth.map((m) => {
                  const pct = Math.round((m.totalKobo / maxMonthly) * 100);
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">
                        {monthLabel(m.month)}
                      </span>
                      <div className="flex-1 h-6 rounded bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded bg-primary/70 flex items-center pl-2 transition-all"
                          style={{ width: `${Math.max(pct, 4)}%` }}>
                          <span className="text-xs text-white font-medium whitespace-nowrap">
                            {naira(m.totalKobo)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                        {m.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PayDirect planning note */}
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            PayDirect Integration — STORY-068 (Planned)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Integration with Anambra State PayDirect for reconciliation against
            the State Government bank account is planned for a future sprint.
            This will enable automatic matching of Paystack deposits to
            PayDirect confirmation numbers and flag discrepancies for Finance
            Officer review.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${bg}`}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
