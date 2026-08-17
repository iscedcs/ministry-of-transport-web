/**
 * Typed system settings.
 *
 * The platform already had a free-text key/value config table, which is fine
 * for gateway URLs but useless as a control panel — an admin had to know the
 * exact key and type a raw value. This module puts a declared schema in front
 * of it: each setting has a type, a default, a group and a description, so the
 * admin screen can render real toggles and the code can read a typed value
 * without guessing.
 *
 * Adding a setting here is the whole job — the admin UI is generated from
 * this list. A setting only belongs here once something actually reads it.
 */

import { db } from "@/lib/db";

export type SettingType = "boolean" | "number" | "text";

export interface SettingDef {
  key: string;
  label: string;
  description: string;
  type: SettingType;
  default: string;
  group: string;
  /** Numeric bounds, applied on save. */
  min?: number;
  max?: number;
}

export const SETTING_GROUPS = [
  "Certificate Validity",
  "TRACAS Letter of Authority",
  "TRACAS Driver ID Card",
  "Fleet Numbering",
] as const;

export const SETTINGS: SettingDef[] = [
  // ── How long an approval lasts ────────────────────────────────────────────
  // Kept per document type rather than shared: the Ministry may lengthen a
  // motor park permit without touching a revalidation, and hard-coding these
  // meant a deployment every time a period changed.
  {
    key: "revalidation.validity.temporalMonths",
    label: "Revalidation — temporal approval (months)",
    description:
      "How long a TEMPORAL revalidation certificate remains valid. Printed on the certificate as the revalidation period.",
    type: "number",
    default: "6",
    group: "Certificate Validity",
    min: 1,
    max: 120,
  },
  {
    key: "revalidation.validity.permanentMonths",
    label: "Revalidation — full approval (months)",
    description: "How long a FULL revalidation certificate remains valid.",
    type: "number",
    default: "12",
    group: "Certificate Validity",
    min: 1,
    max: 120,
  },
  {
    key: "motorpark.validity.temporalMonths",
    label: "Motor park — temporal approval (months)",
    description:
      "How long a temporal motor park approval remains valid before a full permit is required.",
    type: "number",
    default: "6",
    group: "Certificate Validity",
    min: 1,
    max: 120,
  },
  {
    key: "motorpark.validity.permanentMonths",
    label: "Motor park — full permit (months)",
    description: "How long a full motor park permit remains valid.",
    type: "number",
    default: "12",
    group: "Certificate Validity",
    min: 1,
    max: 120,
  },
  {
    key: "masstransit.validity.temporalMonths",
    label: "Mass transit — temporal approval (months)",
    description:
      "How long a temporal mass transit approval and its terminal certificate remain valid.",
    type: "number",
    default: "6",
    group: "Certificate Validity",
    min: 1,
    max: 120,
  },
  {
    key: "masstransit.validity.permanentMonths",
    label: "Mass transit — full approval (months)",
    description:
      "How long a full mass transit approval and its terminal certificate remain valid.",
    type: "number",
    default: "12",
    group: "Certificate Validity",
    min: 1,
    max: 120,
  },

  // ── Letter of Authority ───────────────────────────────────────────────────
  {
    key: "tracas.letter.showOwnerName",
    label: "Show vehicle owner on the letter",
    description:
      "Prints the owner's name, phone and ownership type in the particulars block. TRACAS asked for this to be removed, so it is off by default.",
    type: "boolean",
    default: "false",
    group: "TRACAS Letter of Authority",
  },
  {
    key: "tracas.letter.showDriverName",
    label: "Show driver's name on the letter",
    description: "Prints the assigned driver's name in the particulars block.",
    type: "boolean",
    default: "true",
    group: "TRACAS Letter of Authority",
  },
  {
    key: "tracas.letter.showQrCode",
    label: "Show the verification QR code",
    description:
      "Prints the QR code that resolves to the public verification page.",
    type: "boolean",
    default: "true",
    group: "TRACAS Letter of Authority",
  },

  // ── Driver ID card ────────────────────────────────────────────────────────
  {
    key: "tracas.idcard.showOwnerName",
    label: "Show vehicle owner on the ID card",
    description:
      "Prints the owner of the assigned vehicle on the back of the card.",
    type: "boolean",
    default: "false",
    group: "TRACAS Driver ID Card",
  },

  // ── Fleet numbering ───────────────────────────────────────────────────────
  {
    key: "tracas.fleet.lv.nextNumber",
    label: "Next LV number",
    description:
      "The number the next privately-owned vehicle receives. Leave at 0 to continue from the highest LV in use.",
    type: "number",
    default: "0",
    group: "Fleet Numbering",
    min: 0,
    max: 99999,
  },
  {
    key: "tracas.fleet.ft.nextNumber",
    label: "Next FT number",
    description:
      "The number the next government-owned vehicle receives. Leave at 0 to continue from the highest FT in use.",
    type: "number",
    default: "0",
    group: "Fleet Numbering",
    min: 0,
    max: 99999,
  },
  {
    key: "tracas.fleet.padding",
    label: "Fleet number padding",
    description:
      "Digits a fleet number is padded to. 3 produces LV097; 4 would produce LV0097.",
    type: "number",
    default: "3",
    group: "Fleet Numbering",
    min: 1,
    max: 6,
  },
  {
    key: "tracas.fleet.fillGaps",
    label: "Reuse gaps in the sequence",
    description:
      "When on, a new vehicle takes the lowest unused number rather than the next one after the highest. Off keeps the sequence strictly increasing.",
    type: "boolean",
    default: "false",
    group: "Fleet Numbering",
  },
];

const BY_KEY = new Map(SETTINGS.map((s) => [s.key, s]));

export function getSettingDef(key: string): SettingDef | undefined {
  return BY_KEY.get(key);
}

/** Every setting's current value, defaults filled in for anything unset. */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.systemConfiguration.findMany({
    where: { configKey: { in: SETTINGS.map((s) => s.key) } },
    select: { configKey: true, configValue: true },
  });

  const stored = new Map(rows.map((r) => [r.configKey, r.configValue]));
  const out: Record<string, string> = {};
  for (const s of SETTINGS) out[s.key] = stored.get(s.key) ?? s.default;
  return out;
}

/** A single boolean setting. Unknown keys read as false rather than throwing. */
export async function getBoolSetting(key: string): Promise<boolean> {
  const def = BY_KEY.get(key);
  const row = await db.systemConfiguration.findUnique({
    where: { configKey: key },
    select: { configValue: true },
  });
  return (row?.configValue ?? def?.default ?? "false") === "true";
}

/** A single numeric setting. */
export async function getNumberSetting(key: string): Promise<number> {
  const def = BY_KEY.get(key);
  const row = await db.systemConfiguration.findUnique({
    where: { configKey: key },
    select: { configValue: true },
  });
  const n = Number(row?.configValue ?? def?.default ?? "0");
  return Number.isFinite(n) ? n : 0;
}

/**
 * Several settings at once, as booleans. Cheaper than one query per key when a
 * component needs a handful — a printed letter reads three.
 */
export async function getBoolSettings(
  keys: string[],
): Promise<Record<string, boolean>> {
  const rows = await db.systemConfiguration.findMany({
    where: { configKey: { in: keys } },
    select: { configKey: true, configValue: true },
  });
  const stored = new Map(rows.map((r) => [r.configKey, r.configValue]));
  const out: Record<string, boolean> = {};
  for (const k of keys) {
    out[k] = (stored.get(k) ?? BY_KEY.get(k)?.default ?? "false") === "true";
  }
  return out;
}
