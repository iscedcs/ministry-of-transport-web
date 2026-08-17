/**
 * Terminal / depot inspection checklist.
 *
 * The terminal inspection previously captured one free-text box and a
 * recommendation, which gave the HOD nothing specific to weigh and left no
 * record of what was actually looked at. This mirrors the revalidation
 * checklist: named items, each verified YES / NO / PARTIAL with a note, plus
 * photographic evidence.
 *
 * A terminal becomes a motor park on approval, so the facility items are
 * deliberately the same ones a park is judged on — the two must not drift.
 */

import { FACILITY_OPTIONS, type Verified } from "@/lib/revalidation-checklist";

export type { Verified };

/**
 * Terminal items carry their own section letters (A-D). The revalidation type
 * is pinned to its own sections (E/F/G), and widening it there would weaken a
 * guarantee that module relies on.
 */
export interface ChecklistItem {
  key: string;
  section: "A" | "B" | "C" | "D";
  label: string;
  /** What the operator claimed, rendered for comparison. */
  declared: string;
  verified: Verified | null;
  note?: string;
}

export const TERMINAL_SECTION_TITLES: Record<string, string> = {
  A: "Premises & Access",
  B: "Facilities on site",
  C: "Safety & Security",
  D: "Fleet & Operations",
};

/** Premises — is the site actually usable as a terminal? */
const PREMISES = [
  "Site clearly demarcated and accessible from the road",
  "Adequate parking capacity for the declared fleet",
  "Surface suitable for vehicle movement in wet season",
  "Entrance and exit separated or safely managed",
];

/** Safety and security, including the camera requirement. */
const SAFETY = [
  "CCTV cameras installed and functioning",
  "Fire extinguishers present and in date",
  "Security post manned",
  "Safety signage displayed",
  "Emergency exit route clear",
];

/** Fleet and operations. */
const OPERATIONS = [
  "Declared fleet physically present at the terminal",
  "Vehicles carry the approved branding / colour",
  "Driver rest area provided",
  "Ticketing / boarding point identifiable",
];

/**
 * The full checklist for a terminal inspection.
 *
 * `declaredFacilities` is what the operator claimed on the application — the
 * inspector verifies each against what is on site, exactly as the park
 * revalidation checklist works.
 */
export function buildTerminalChecklist(
  declaredFacilities: string[] = [],
): ChecklistItem[] {
  const declared = new Set(declaredFacilities);

  const premises: ChecklistItem[] = PREMISES.map((label) => ({
    key: `premises:${label}`,
    section: "A" as const,
    label,
    declared: "To verify on site",
    verified: null,
  }));

  const facilities: ChecklistItem[] = FACILITY_OPTIONS.map((label) => ({
    key: `facility:${label}`,
    section: "B" as const,
    label,
    declared: declared.has(label) ? "Declared present" : "Not declared",
    verified: null,
  }));

  const safety: ChecklistItem[] = SAFETY.map((label) => ({
    key: `safety:${label}`,
    section: "C" as const,
    label,
    declared: "To verify on site",
    verified: null,
  }));

  const operations: ChecklistItem[] = OPERATIONS.map((label) => ({
    key: `ops:${label}`,
    section: "D" as const,
    label,
    declared: "To verify on site",
    verified: null,
  }));

  return [...premises, ...facilities, ...safety, ...operations];
}

/** Reads a stored checklist back, tolerant of the shapes in the wild. */
export function parseTerminalChecklist(raw: unknown): ChecklistItem[] {
  if (!raw) return [];
  const arr = typeof raw === "string" ? safeParse(raw) : raw;
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (x): x is ChecklistItem =>
      !!x && typeof x === "object" && "key" in x && "label" in x,
  );
}

function safeParse(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

/** Headline counts for the HOD reviewing the report. */
export function checklistSummary(items: ChecklistItem[]) {
  return {
    total: items.length,
    verified: items.filter((i) => i.verified === "YES").length,
    partial: items.filter((i) => i.verified === "PARTIAL").length,
    failed: items.filter((i) => i.verified === "NO").length,
    unanswered: items.filter((i) => i.verified == null).length,
  };
}
