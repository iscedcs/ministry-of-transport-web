"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Truck, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/badge";
import type { TowingVanListItem } from "@/app/actions/towing";
import type { TowingVanStatus } from "@prisma/client";
import { fmtDateShort } from "@/lib/utils/format";

export default function TowingVansClient({
  vans,
  stats,
  pagination,
  statusFilter,
  searchQuery,
  canWrite,
}: {
  vans: TowingVanListItem[];
  stats: { total: number; issued: number; pending: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  statusFilter?: TowingVanStatus;
  searchQuery: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchQuery);

  const setParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`/towing-vans?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Towing Vans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registration and the Anambra State Towing Permit.
          </p>
        </div>
        {canWrite && (
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/towing-vans/register">
              <Plus className="h-4 w-4" />
              Register towing van
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total registered
            </p>
            <p className="mt-1 text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Permit issued
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.issued}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Awaiting permit
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pending}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setParam("q", q)}
                placeholder="Search plate, operator or permit number..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setParam("q", q)}>
              Search
            </Button>
            <div className="flex gap-1">
              {(["", "REGISTERED", "PERMIT_ISSUED"] as const).map((s) => (
                <button
                  key={s || "ALL"}
                  type="button"
                  onClick={() => setParam("status", s || undefined)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    (statusFilter ?? "") === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}>
                  {s === "" ? "All" : s === "REGISTERED" ? "Awaiting permit" : "Permit issued"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {vans.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No towing vans found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Plate
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                      Type
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Operator
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                      LGA
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Permit No.
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vans.map((v, i) => (
                    <tr
                      key={v.id}
                      className={`cursor-pointer hover:bg-secondary/40 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                      onClick={() => router.push(`/towing-vans/${v.id}`)}>
                      <td className="px-4 py-2.5 font-mono text-xs flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        {v.plateNumber}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">{v.vehicleType}</td>
                      <td className="px-4 py-2.5">
                        <div>{v.operatorName}</div>
                        <div className="text-xs text-muted-foreground">{v.operatorPhone}</div>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">{v.lgaName ?? "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{v.permitNumber ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={v.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setParam("page", String(pagination.page - 1))}>
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setParam("page", String(pagination.page + 1))}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
