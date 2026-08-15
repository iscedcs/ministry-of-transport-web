"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateSetting, resetSettingGroup } from "@/app/actions/system-settings";
import type { SettingDef } from "@/lib/system-config";

/**
 * Generated from the setting registry — adding a setting to
 * lib/system-config.ts is enough to make it appear here.
 */
export function SettingsPanel({
  groups,
  initial,
}: {
  groups: { group: string; settings: SettingDef[] }[];
  initial: Record<string, string>;
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(def: SettingDef, next: string) {
    const previous = values[def.key];
    setValues((v) => ({ ...v, [def.key]: next })); // optimistic
    setSaving(def.key);
    startTransition(async () => {
      const res = await updateSetting(def.key, next);
      setSaving(null);
      if (res.success) {
        toast.success(`${def.label} saved`);
      } else {
        setValues((v) => ({ ...v, [def.key]: previous })); // roll back
        toast.error(res.error ?? "Failed to save");
      }
    });
  }

  function reset(group: string) {
    if (!confirm(`Reset every setting in "${group}" to its default?`)) return;
    startTransition(async () => {
      const res = await resetSettingGroup(group);
      if (res.success) {
        toast.success(`${res.data?.reset ?? 0} setting(s) reset — reloading`);
        window.location.reload();
      } else {
        toast.error(res.error ?? "Failed to reset");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ group, settings }) => (
        <Card key={group}>
          <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{group}</CardTitle>
              <CardDescription>
                Changes take effect immediately — no redeploy.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => reset(group)}
              disabled={isPending}
              className="shrink-0 text-xs text-muted-foreground">
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Defaults
            </Button>
          </CardHeader>
          <CardContent className="divide-y">
            {settings.map((def) => {
              const value = values[def.key] ?? def.default;
              const busy = saving === def.key;
              const modified = value !== def.default;

              return (
                <div
                  key={def.key}
                  className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {def.label}
                      </p>
                      {modified && (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Changed
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {def.description}
                    </p>
                    <code className="mt-1 block text-[11px] text-muted-foreground/70">
                      {def.key}
                    </code>
                  </div>

                  <div className="shrink-0">
                    {def.type === "boolean" ? (
                      // The word matters more than the switch: an admin should
                      // never have to infer On or Off from a knob position.
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            value === "true"
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}>
                          {value === "true" ? "On" : "Off"}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={value === "true"}
                          aria-label={def.label}
                          disabled={busy}
                          onClick={() =>
                            save(def, value === "true" ? "false" : "true")
                          }
                          className={cn(
                            "relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50",
                            value === "true"
                              ? "border-primary bg-primary"
                              : "border-border bg-muted",
                          )}>
                          <span
                            className={cn(
                              "absolute top-0.5 h-5 w-5 rounded-full shadow transition-transform",
                              value === "true"
                                ? "translate-x-[1.375rem] bg-white"
                                : "translate-x-0.5 bg-muted-foreground/70",
                            )}
                          />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type={def.type === "number" ? "number" : "text"}
                          min={def.min}
                          max={def.max}
                          value={value}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [def.key]: e.target.value }))
                          }
                          onBlur={(e) => {
                            if (e.target.value !== initial[def.key]) {
                              save(def, e.target.value);
                            }
                          }}
                          className="h-9 w-28"
                        />
                        {busy && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
