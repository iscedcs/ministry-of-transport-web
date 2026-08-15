/**
 * Data Export — Ministry of Transport Platform
 * STORY-089/090 | EPIC-005
 *
 * Client-side CSV download for Ministry data exports.
 * Server action fetches data; client converts to CSV and triggers download.
 * Access: PERMANENT_SECRETARY, SYSTEM_ADMIN, ADMIN
 * (enforced in getExportData, since this is a client component)
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileDown } from "lucide-react";
import { getExportData } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ExportType =
  | "users"
  | "motor_parks"
  | "fleet_operators"
  | "payments"
  | "audit_logs";

interface ExportConfig {
  type: ExportType;
  label: string;
  description: string;
  icon: string;
}

const EXPORTS: ExportConfig[] = [
  {
    type: "users",
    label: "Staff Users",
    description: "All Ministry staff accounts with roles and status",
    icon: "👥",
  },
  {
    type: "motor_parks",
    label: "Motor Parks",
    description: "All registered motor parks with status and location",
    icon: "🏗️",
  },
  {
    type: "fleet_operators",
    label: "Fleet Operators",
    description: "All mass transit company registrations",
    icon: "🚌",
  },
  {
    type: "payments",
    label: "Payments",
    description: "All payment transactions with amounts and status",
    icon: "💰",
  },
  {
    type: "audit_logs",
    label: "Audit Logs",
    description: "Complete system audit trail (last 10,000 entries)",
    icon: "📋",
  },
];

function arrayToCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return lines.join("\r\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataExportPage() {
  const [loading, setLoading] = useState<ExportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(cfg: ExportConfig) {
    setLoading(cfg.type);
    setError(null);
    try {
      const result = await getExportData(cfg.type);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!result.data) {
        setError("Export failed. Please try again.");
        return;
      }
      const { headers, rows } = result.data;
      const csv = arrayToCsv(headers, rows);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`mot-${cfg.type}-${date}.csv`, csv);
    } catch {
      setError("An unexpected error occurred during export.");
    } finally {
      setLoading(null);
    }
  }

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
          <span className="text-foreground">Data Export</span>
        </nav>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}>
          Data Export
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Download Ministry records as CSV files
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((cfg) => {
          const isLoading = loading === cfg.type;
          return (
            <Card key={cfg.type} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{cfg.icon}</span>
                  <div>
                    <CardTitle className="text-sm">{cfg.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {cfg.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={loading !== null}
                  onClick={() => handleExport(cfg)}>
                  {isLoading ? (
                    <>
                      <FileDown className="mr-2 h-4 w-4 animate-bounce" />
                      Preparing…
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Files are generated on demand and downloaded directly to your browser.
        No data is stored on external servers.
      </p>
    </div>
  );
}
