/**
 * Fee Schedule — Ministry of Transport Platform
 * STORY-083 | EPIC-005
 *
 * View, add, and activate/deactivate FeeSchedule records.
 * Amounts are entered in Naira; stored as kobo in the DB.
 * Access: PERMANENT_SECRETARY, SYSTEM_ADMIN
 */

"use client";

import { useActionState } from "react";
import { useState } from "react";
import Link from "next/link";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import {
  createFeeSchedule,
  toggleFeeScheduleActive,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FeeScheduleItem } from "@/app/actions/admin";
import { FEE_TYPES } from "@/lib/utils/labels";
import { formatNaira as fmt, fmtDate } from "@/lib/utils/format";

export function FeeScheduleClient({
  initialFees,
}: {
  initialFees: FeeScheduleItem[];
}) {
  const [fees, setFees] = useState<FeeScheduleItem[]>(initialFees);
  const [showForm, setShowForm] = useState(false);
  const [createState, createAction, isCreating] = useActionState(
    createFeeSchedule,
    {
      success: false,
      error: "",
    },
  );

  async function handleToggle(feeId: string, isActive: boolean) {
    const result = await toggleFeeScheduleActive(feeId, !isActive);
    if (result.success) {
      setFees((prev) =>
        prev.map((f) => (f.id === feeId ? { ...f, isActive: !isActive } : f)),
      );
    }
  }

  // Reset form on success
  if (createState?.success && showForm) {
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Link
              href="/admin"
              className="hover:text-foreground transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Fee Schedule</span>
          </nav>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}>
            Fee Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fees.length} fee record{fees.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Fee
        </Button>
      </div>

      {/* Add Fee Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Fee Record</CardTitle>
            <CardDescription>Amounts are entered in Naira (₦)</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="feeType">
                    Fee Type <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="feeType"
                    name="feeType"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="">Select type…</option>
                    {FEE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">
                    Amount (₦) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amount"
                    name="amountNaira"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="5000"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Brief description of this fee"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="effectiveFrom">
                    Effective From <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="effectiveFrom"
                    name="effectiveFrom"
                    type="date"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="effectiveTo">Effective To</Label>
                  <Input id="effectiveTo" name="effectiveTo" type="date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="revenueCode">Revenue Code</Label>
                  <Input
                    id="revenueCode"
                    name="revenueCode"
                    placeholder="e.g. RC-001"
                  />
                </div>
              </div>
              {createState?.success === false && createState.error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {createState.error}
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating…" : "Create Fee"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Fee Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">All Fee Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No fee records yet. Add the first one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Fee Type
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                      Effective From
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                      Revenue Code
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                      Active
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee) => (
                    <tr
                      key={fee.id}
                      className="border-t border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">
                          {fee.feeType.replace(/_/g, " ")}
                        </p>
                        {fee.description && (
                          <p className="text-xs text-muted-foreground">
                            {fee.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-medium">
                        {fmt(fee.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {fmtDate(fee.effectiveFrom)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono hidden lg:table-cell">
                        {fee.revenueCode ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fee.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggle(fee.id, fee.isActive)}
                          className={fee.isActive ? "text-destructive" : ""}>
                          {fee.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
