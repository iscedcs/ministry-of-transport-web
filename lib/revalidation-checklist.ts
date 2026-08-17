/**
 * Revalidation inspection checklist.
 *
 * The inspector's job is to verify what the applicant DECLARED on the
 * revalidation form, so the checklist is derived from the application itself
 * rather than a fixed template: every facility they claimed in Section E,
 * every compliance answer in Section F, and the staffing figures in Section G.
 *
 * That gives the HOD a line-by-line comparison — declared vs. found — instead
 * of a paragraph of prose.
 */

/** The full facility list offered on the application form. */
export const FACILITY_OPTIONS = [
  "Perimeter Fence",
  "Security Post",
  "Toilet Facilities",
  "Borehole/Water Supply",
  "Passenger Waiting Area",
  "Loading Bay",
  "Fire Extinguishers",
  "CCTV Cameras",
  "Solar/Street Lights",
  "Ticketing Point",
  "Manager/Admin Office",
];

/**
 * "N_A" is a deliberate verdict, not a blank. An item that does not apply to
 * this facility — a loading bay has no passenger waiting area — must be
 * distinguishable from one the inspector simply did not answer, or the HOD
 * reads an unanswered checklist as a complete one.
 */
export type Verified = "YES" | "NO" | "PARTIAL" | "N_A";

export interface ChecklistItem {
  key: string;
  section: "E" | "F" | "G";
  label: string;
  /** What the applicant claimed, rendered for comparison. */
  declared: string;
  verified: Verified | null;
  note?: string;
}

/** Shape of the application fields the checklist is built from. */
export interface ChecklistSource {
  facilitiesAvailable: unknown;
  maintainsManifest: boolean | null;
  operatorsRegistered: boolean | null;
  paymentsUpToDate: boolean | null;
  safetySignages: boolean | null;
  pendingSanctions: boolean | null;
  sanctionDetails: string | null;
  managementStaffCount: number;
  adminStaffCount: number;
  securityStaffCount: number;
  otherStaffCount: number;
  securityArrangement: string | null;
  operationalStatus: string | null;
  dailyVehiclesCount: string | null;
}

const yesNo = (v: boolean | null | undefined) =>
  v === null || v === undefined ? "Not stated" : v ? "Yes" : "No";

/** Applicant's facility selection, tolerant of the JSON shapes in the wild. */
function declaredFacilities(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (raw && typeof raw === "object") {
    // Some drafts stored { "Perimeter Fence": true, ... }
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

/**
 * Build the checklist for an application. Every facility on the form appears,
 * so the inspector can also flag something present that was never declared.
 */
export function buildChecklist(app: ChecklistSource): ChecklistItem[] {
  const declared = new Set(declaredFacilities(app.facilitiesAvailable));

  const facilities: ChecklistItem[] = FACILITY_OPTIONS.map((label) => ({
    key: `facility:${label}`,
    section: "E",
    label,
    declared: declared.has(label) ? "Declared present" : "Not declared",
    verified: null,
  }));

  const compliance: ChecklistItem[] = [
    {
      key: "compliance:manifest",
      section: "F",
      label: "Maintains passenger/cargo manifest",
      declared: yesNo(app.maintainsManifest),
      verified: null,
    },
    {
      key: "compliance:operators",
      section: "F",
      label: "Operators registered with the Ministry",
      declared: yesNo(app.operatorsRegistered),
      verified: null,
    },
    {
      key: "compliance:payments",
      section: "F",
      label: "Payments up to date",
      declared: yesNo(app.paymentsUpToDate),
      verified: null,
    },
    {
      key: "compliance:signage",
      section: "F",
      label: "Safety signage displayed",
      declared: yesNo(app.safetySignages),
      verified: null,
    },
    {
      key: "compliance:sanctions",
      section: "F",
      label: "Free of pending sanctions",
      declared:
        app.pendingSanctions === null || app.pendingSanctions === undefined
          ? "Not stated"
          : app.pendingSanctions
            ? `Sanctions declared${app.sanctionDetails ? `: ${app.sanctionDetails}` : ""}`
            : "None declared",
      verified: null,
    },
  ];

  const staffing: ChecklistItem[] = [
    {
      key: "staff:management",
      section: "G",
      label: "Management staff on site",
      declared: `${app.managementStaffCount} declared`,
      verified: null,
    },
    {
      key: "staff:admin",
      section: "G",
      label: "Administrative staff on site",
      declared: `${app.adminStaffCount} declared`,
      verified: null,
    },
    {
      key: "staff:security",
      section: "G",
      label: "Security staff on site",
      declared: `${app.securityStaffCount} declared`,
      verified: null,
    },
    {
      key: "staff:other",
      section: "G",
      label: "Other staff on site",
      declared: `${app.otherStaffCount} declared`,
      verified: null,
    },
    {
      key: "staff:security-arrangement",
      section: "G",
      label: "Security arrangement as described",
      declared: app.securityArrangement || "—",
      verified: null,
    },
    {
      key: "ops:status",
      section: "G",
      label: "Operational status as declared",
      declared: app.operationalStatus || "—",
      verified: null,
    },
    {
      key: "ops:daily-vehicles",
      section: "G",
      label: "Daily vehicle throughput as declared",
      declared: app.dailyVehiclesCount || "—",
      verified: null,
    },
  ];

  return [...facilities, ...compliance, ...staffing];
}

export const SECTION_TITLES: Record<ChecklistItem["section"], string> = {
  E: "Section E — Facilities",
  F: "Section F — Regulatory Compliance",
  G: "Section G — Staffing & Operations",
};

/** Parse a stored checklist back out of the JSON column. */
export function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is ChecklistItem =>
      !!i && typeof i === "object" && "key" in i && "label" in i,
  );
}
