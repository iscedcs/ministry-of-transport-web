"use server";

/**
 * Reading and writing the typed settings declared in lib/system-config.ts.
 *
 * Values are validated against the declared type and bounds here, so the admin
 * screen cannot store "yes" in a boolean or a negative padding.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { SETTINGS, getSettingDef, getAllSettings } from "@/lib/system-config";

export async function listSettings(): Promise<{
  success: boolean;
  error?: string;
  data?: Record<string, string>;
}> {
  const authz = await authorize(["SYSTEM_ADMIN"]);
  if (!authz.ok) return { success: false, error: authz.error };
  return { success: true, data: await getAllSettings() };
}

export async function updateSetting(
  key: string,
  value: string,
): Promise<{ success: boolean; error?: string }> {
  const authz = await authorize(["SYSTEM_ADMIN"]);
  if (!authz.ok) return { success: false, error: authz.error };

  const def = getSettingDef(key);
  if (!def) return { success: false, error: "Unknown setting." };

  let stored = value.trim();

  if (def.type === "boolean") {
    if (stored !== "true" && stored !== "false") {
      return { success: false, error: "This setting is on or off." };
    }
  } else if (def.type === "number") {
    const n = Number(stored);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { success: false, error: `${def.label} must be a whole number.` };
    }
    if (def.min !== undefined && n < def.min) {
      return { success: false, error: `${def.label} cannot be below ${def.min}.` };
    }
    if (def.max !== undefined && n > def.max) {
      return { success: false, error: `${def.label} cannot be above ${def.max}.` };
    }
    stored = String(n);
  }

  const previous = await db.systemConfiguration.findUnique({
    where: { configKey: key },
    select: { configValue: true },
  });

  await db.systemConfiguration.upsert({
    where: { configKey: key },
    create: { configKey: key, configValue: stored, description: def.description },
    update: { configValue: stored, description: def.description },
  });

  await recordAudit({
    action: "SYSTEM_SETTING_UPDATED",
    entityType: "SystemConfiguration",
    entityId: key,
    changeDescription: `${def.label}: ${previous?.configValue ?? def.default} → ${stored}`,
    oldValues: { [key]: previous?.configValue ?? def.default },
    newValues: { [key]: stored },
  });

  // Printed documents and the fleet generator both read these.
  revalidatePath("/admin/config");
  revalidatePath("/tracas");
  revalidatePath("/ict-printing");
  return { success: true };
}

/** Restores every setting in a group to its declared default. */
export async function resetSettingGroup(
  group: string,
): Promise<{ success: boolean; error?: string; data?: { reset: number } }> {
  const authz = await authorize(["SYSTEM_ADMIN"]);
  if (!authz.ok) return { success: false, error: authz.error };

  const defs = SETTINGS.filter((s) => s.group === group);
  if (defs.length === 0) return { success: false, error: "Unknown group." };

  for (const d of defs) {
    await db.systemConfiguration.upsert({
      where: { configKey: d.key },
      create: { configKey: d.key, configValue: d.default, description: d.description },
      update: { configValue: d.default },
    });
  }

  await recordAudit({
    action: "SYSTEM_SETTINGS_RESET",
    entityType: "SystemConfiguration",
    entityId: group,
    changeDescription: `Reset ${defs.length} setting(s) in "${group}" to defaults`,
  });

  revalidatePath("/admin/config");
  return { success: true, data: { reset: defs.length } };
}
