/**
 * System Configuration — Ministry of Transport Platform
 * STORY-085/086 | EPIC-005
 *
 * Key-value system configuration store. Used for SMS gateway settings,
 * Paystack metadata, notification preferences, etc.
 *
 * SYSTEM_ADMIN only. Sensitive keys (SECRET/PASSWORD) are blocked.
 * Actual API secrets MUST be set as environment variables.
 */

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Info } from "lucide-react";
import { upsertSystemConfig } from "@/app/actions/admin";
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
import type { SystemConfigEntry } from "@/app/actions/admin";
import { fmtDateTimeShort as fmtDate } from "@/lib/utils/format";

const SUGGESTED_KEYS = [
  { key: "SMS_SENDER_ID", hint: "Sender name for outbound SMS (max 11 chars)" },
  { key: "SMS_GATEWAY_URL", hint: "Base URL for the SMS gateway REST API" },
  {
    key: "NOTIFICATION_EMAIL_FROM",
    hint: "Sender email for system notifications",
  },
  {
    key: "PAYSTACK_PUBLIC_KEY",
    hint: "pk_live_… — safe to store, used client-side",
  },
  { key: "PAYSTACK_WEBHOOK_URL", hint: "Your Paystack webhook endpoint URL" },
  {
    key: "MAX_PARKS_PER_OPERATOR",
    hint: "Business rule: max parks an operator can register",
  },
  {
    key: "INSPECTION_EXPIRY_DAYS",
    hint: "Days before an inspection result expires",
  },
  {
    key: "PERMIT_VALIDITY_MONTHS",
    hint: "Default operating permit validity in months",
  },
];

export function SystemConfigClient({
  initialConfigs,
}: {
  initialConfigs: SystemConfigEntry[];
}) {
  const [configs, setConfigs] = useState<SystemConfigEntry[]>(initialConfigs);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SystemConfigEntry | null>(
    null,
  );
  const [upsertState, upsertAction, isUpserting] = useActionState(
    upsertSystemConfig,
    {
      success: false,
      error: "",
    },
  );

  function openEdit(entry: SystemConfigEntry) {
    setEditingEntry(entry);
    setShowForm(true);
  }

  // Optimistically update list after successful upsert — page will re-validate next render
  if (upsertState?.success && showForm) {
    setShowForm(false);
    setEditingEntry(null);
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
            <span className="text-foreground">System Config</span>
          </nav>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}>
            System Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {configs.length} key{configs.length !== 1 ? "s" : ""} stored
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingEntry(null);
            setShowForm((v) => !v);
          }}>
          <Plus className="mr-2 h-4 w-4" />
          Add / Update Key
        </Button>
      </div>

      {/* Security notice */}
      <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          API secrets and passwords must be set as{" "}
          <strong>environment variables</strong>. Do not store them here — keys
          containing &quot;SECRET&quot; or &quot;PASSWORD&quot; are blocked.
        </p>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {editingEntry
                ? "Edit Configuration Key"
                : "Add Configuration Key"}
            </CardTitle>
            <CardDescription>
              {editingEntry
                ? `Updating: ${editingEntry.configKey}`
                : "Leave value blank to delete the key."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertAction} className="flex flex-col gap-4">
              {editingEntry ? (
                <input
                  type="hidden"
                  name="configKey"
                  value={editingEntry.configKey}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="configKey">
                    Key <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="configKey"
                    name="configKey"
                    required
                    placeholder="UPPER_SNAKE_CASE recommended"
                    list="configKeySuggestions"
                  />
                  <datalist id="configKeySuggestions">
                    {SUGGESTED_KEYS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.hint}
                      </option>
                    ))}
                  </datalist>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="configValue">Value</Label>
                <Input
                  id="configValue"
                  name="configValue"
                  defaultValue={editingEntry?.configValue ?? ""}
                  placeholder="Configuration value"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editingEntry?.description ?? ""}
                  placeholder="What does this key control?"
                />
              </div>

              {upsertState?.success === false && upsertState.error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {upsertState.error}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEntry(null);
                  }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpserting}>
                  {isUpserting ? "Saving…" : editingEntry ? "Update" : "Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Config Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Stored Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {configs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No configuration keys yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Key
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Value
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                      Last Updated
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {configs.map((cfg) => (
                    <tr
                      key={cfg.id}
                      className="border-t border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium">
                        {cfg.configKey}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {cfg.configValue}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {cfg.description ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {fmtDate(cfg.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(cfg)}>
                          Edit
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
