/**
 * TRACAS hub navigation — single source of truth.
 *
 * The sidebar shows ONE "TRACAS" entry; the four views share a tab bar. Both
 * derive from this list, so a role added or removed here changes the sidebar
 * entry, the landing destination and the visible tabs together.
 *
 * The role sets mirror the existing server-side guards. They are the ceiling
 * for what a role can *see*; each server action still enforces its own
 * permission independently — this only decides what is offered.
 */

import type { UserRole } from "@prisma/client";

export interface TracasTab {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

/**
 * Order matters: a role's landing destination is the first tab it can see, so
 * an approver lands on their queue rather than a register they cannot action.
 */
export const TRACAS_TABS: TracasTab[] = [
  {
    label: "Fleet & Transport",
    href: "/tracas",
    icon: "🚏",
    roles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS",
      "FIELD_INSPECTOR",
      "SYSTEM_ADMIN",
      "TRACAS_MD",
      "ENUMERATOR",
      // Oversight of the register. The onboarding and reassignment ACTIONS on
      // these pages keep their own narrower role lists.
      "ADMIN",
    ],
  },
  {
    label: "Letter Approvals",
    href: "/tracas-approvals",
    icon: "🖊️",
    roles: [
      "VEHICLE_INSPECTION_OFFICER",
      "HOD_VIS",
      "TRACAS_MD",
      "COMMISSIONER",
      "SYSTEM_ADMIN",
      "PERMANENT_SECRETARY",
      "ADMIN",
    ],
  },
  {
    label: "ID Card Approvals",
    href: "/id-card-approvals",
    icon: "🪪",
    roles: [
      "VEHICLE_INSPECTION_OFFICER",
      "HOD_VIS",
      "TRACAS_MD",
      "COMMISSIONER",
      "SYSTEM_ADMIN",
      "PERMANENT_SECRETARY",
      "ADMIN",
    ],
  },
  {
    label: "TRACAS Staff",
    href: "/tracas-staff",
    icon: "👥",
    roles: ["TRACAS_MD", "SYSTEM_ADMIN", "COMMISSIONER"],
  },
];

/** Tabs this role may see. Empty means no TRACAS entry at all. */
export function tracasTabsFor(role: UserRole | string | null): TracasTab[] {
  if (!role) return [];
  return TRACAS_TABS.filter((t) => (t.roles as string[]).includes(role));
}

/**
 * Where the single sidebar "TRACAS" entry should point for this role — the
 * first tab they can actually use, not a fixed /tracas that would strand
 * approvers on a register they have no business in.
 */
export function tracasLandingFor(role: UserRole | string | null): string | null {
  return tracasTabsFor(role)[0]?.href ?? null;
}

/** True when the role can see any part of TRACAS. */
export function hasTracasAccess(role: UserRole | string | null): boolean {
  return tracasTabsFor(role).length > 0;
}
