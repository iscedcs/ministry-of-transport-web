/**
 * Arrears Tracking Page — Ministry of Transport Platform
 * STORY-066 | EPIC-004 | FR-043
 *
 * Shows all overdue MotorParkFee records.
 * Finance Officer / Admin view.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getArrearsItems } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNaira as naira, fmtDate as fmt } from "@/lib/utils/format";

export default async function ArrearsPage() {
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

  const result = await getArrearsItems();
  const items = result.success ? result.data! : [];

  const totalArrears = items.reduce((sum, item) => sum + item.amountKobo, 0);

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
          <span className="text-foreground">Arrears</span>
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
              Fee Arrears
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {items.length} overdue fee{items.length !== 1 ? "s" : ""} · Total:{" "}
              <span className="font-semibold text-destructive">
                {naira(totalArrears)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm font-medium">No outstanding arrears</p>
            <p className="text-xs text-muted-foreground">
              All fees are paid or within their due dates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Critical arrears alert */}
          {items.some((i) => i.daysOverdue >= 30) && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/40 bg-destructive/5">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Critical Arrears
                </p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  {items.filter((i) => i.daysOverdue >= 30).length} fee
                  {items.filter((i) => i.daysOverdue >= 30).length !== 1
                    ? "s are"
                    : " is"}{" "}
                  more than 30 days overdue. Consider escalating to the
                  Commissioner for enforcement action.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Overdue Fees</CardTitle>
              <CardDescription>
                All fees with a due date in the past and unpaid status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Entity
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Fee Type
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Due Date
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Days Overdue
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.feeId}
                        className="border-t border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={
                              item.entityType === "MOTOR_PARK"
                                ? `/motor-parks/${item.entityId}`
                                : `/fleet-operators/${item.entityId}`
                            }
                            className="text-primary hover:underline font-medium">
                            {item.entityName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {item.entityType.replace(/_/g, " ")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.feeType.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {naira(item.amountKobo)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {fmt(item.dueDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.daysOverdue >= 30
                                ? "bg-destructive/10 text-destructive"
                                : item.daysOverdue >= 14
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"
                            }`}>
                            {item.daysOverdue}d overdue
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={
                                item.entityType === "MOTOR_PARK"
                                  ? `/motor-parks/${item.entityId}/pay?feeId=${item.feeId}`
                                  : `/fleet-operators/${item.entityId}/pay`
                              }>
                              Record Payment
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
