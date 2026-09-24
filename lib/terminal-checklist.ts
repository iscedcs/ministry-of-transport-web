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
 * Terminal items carry their own section letters. A-D are the terminal's own
 * concerns; F and G are the Ministry's approved compliance and staffing
 * sections, carried over from the revalidation checklist unchanged so an
 * inspector answers the same questions whichever module they are working in.
 */
export interface ChecklistItem {
  key: string;
  section: "A" | "B" | "C" | "D" | "F" | "G";
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
  F: "Section F - Regulatory Compliance",
  G: "Section G - Staffing & Operations",
};

/**
 * What the operator declared in Sections F and G, if anything.
 *
 * Every field is optional on the application, so most of these arrive null.
 * That is precisely why the items still appear: an inspector confirming a
 * manifest exists is useful whether or not the operator claimed one, and
 * "Not stated" must never be shown as "No".
 */
export interface TerminalDeclarations {
  maintainsManifest?: boolean | null;
  operatorsRegistered?: boolean | null;
  paymentsUpToDate?: boolean | null;
  safetySignages?: boolean | null;
  pendingSanctions?: boolean | null;
  sanctionDetails?: string | null;
  managementStaffCount?: number | null;
  adminStaffCount?: number | null;
  securityStaffCount?: number | null;
  otherStaffCount?: number | null;
  securityArrangement?: string | null;
  operationalStatus?: string | null;
  dailyVehiclesCount?: string | null;
}

const yesNo = (v: boolean | null | undefined) =>
  v === null || v === undefined ? "Not stated" : v ? "Yes" : "No";

const counted = (v: number | null | undefined) =>
  v === null || v === undefined ? "Not stated" : `${v} declared`;

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
  declarations: TerminalDeclarations = {},
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

  // Sections F and G, item for item as the revalidation checklist asks them.
  // These were missing entirely: eleven of the twenty-three approved items had
  // no counterpart on a terminal inspection.
  const compliance: ChecklistItem[] = [
    {
      key: "compliance:manifest",
      section: "F",
      label: "Maintains passenger/cargo manifest",
      declared: yesNo(declarations.maintainsManifest),
      verified: null,
    },
    {
      key: "compliance:operators",
      section: "F",
      label: "Operators registered with the Ministry",
      declared: yesNo(declarations.operatorsRegistered),
      verified: null,
    },
    {
      key: "compliance:payments",
      section: "F",
      label: "Payments up to date",
      declared: yesNo(declarations.paymentsUpToDate),
      verified: null,
    },
    {
      key: "compliance:signage",
      section: "F",
      label: "Safety signage displayed",
      declared: yesNo(declarations.safetySignages),
      verified: null,
    },
    {
      key: "compliance:sanctions",
      section: "F",
      label: "Free of pending sanctions",
      declared:
        declarations.pendingSanctions === null ||
        declarations.pendingSanctions === undefined
          ? "Not stated"
          : declarations.pendingSanctions
            ? `Sanctions declared${declarations.sanctionDetails ? `: ${declarations.sanctionDetails}` : ""}`
            : "None declared",
      verified: null,
    },
  ];

  const staffing: ChecklistItem[] = [
    {
      key: "staff:management",
      section: "G",
      label: "Management staff on site",
      declared: counted(declarations.managementStaffCount),
      verified: null,
    },
    {
      key: "staff:admin",
      section: "G",
      label: "Administrative staff on site",
      declared: counted(declarations.adminStaffCount),
      verified: null,
    },
    {
      key: "staff:security",
      section: "G",
      label: "Security staff on site",
      declared: counted(declarations.securityStaffCount),
      verified: null,
    },
    {
      key: "staff:other",
      section: "G",
      label: "Other staff on site",
      declared: counted(declarations.otherStaffCount),
      verified: null,
    },
    {
      key: "staff:security-arrangement",
      section: "G",
      label: "Security arrangement as described",
      declared: declarations.securityArrangement || "Not stated",
      verified: null,
    },
    {
      key: "ops:status",
      section: "G",
      label: "Operational status as declared",
      declared: declarations.operationalStatus || "Not stated",
      verified: null,
    },
    {
      key: "ops:daily-vehicles",
      section: "G",
      label: "Daily vehicle throughput as declared",
      declared: declarations.dailyVehiclesCount || "Not stated",
      verified: null,
    },
  ];

  return [
    ...premises,
    ...facilities,
    ...safety,
    ...operations,
    ...compliance,
    ...staffing,
  ];
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
    // Answered as "does not apply" — neither a pass nor a failure.
    notApplicable: items.filter((i) => i.verified === "N_A").length,
    unanswered: items.filter((i) => i.verified == null).length,
  };
}
