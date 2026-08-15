"use client";

/**
 * Dashboard Sidebar — Ministry of Transport Platform
 * Reference: docs/ROLES_AND_DUTIES.md — role-based nav filtering
 *
 * Nav items are shown/hidden based on the user's role.
 * Active item detected via usePathname().
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ROLE_LABELS } from "@/lib/utils/labels";
import { X } from "lucide-react";
import { useMobileMenu } from "./mobile-menu-context";
import {
  TRACAS_TABS,
  hasTracasAccess,
  tracasLandingFor,
} from "@/lib/tracas-nav";

/** Stand-in href for the TRACAS entry, resolved per role at render. */
const TRACAS_HUB_PLACEHOLDER = "__TRACAS_HUB__";

/** Any of these paths should light up the single TRACAS sidebar entry. */
const TRACAS_SECTION_PREFIXES = TRACAS_TABS.map((t) => t.href);

// ─── Nav item definition ─────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: string; // emoji — swapped out for SVG icons in Phase 2
  allowedRoles: UserRole[] | "ALL"; // "ALL" = visible to everyone
}

const NAV_ITEMS: NavItem[] = [
  // ── Universal ──
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    allowedRoles: "ALL",
  },

  // ── TRACAS Module ──
  // A single entry; the four sections are reachable from the in-page tab bar.
  // allowedRoles is derived from lib/tracas-nav.ts at render time.
  {
    label: "TRACAS",
    href: TRACAS_HUB_PLACEHOLDER,
    icon: "🚏",
    allowedRoles: "ALL",
  },

  // ── Motor Park Module ──

  // ── Enumeration Module ──
  {
    label: "Enumeration",
    href: "/enumerator",
    icon: "📋",
    allowedRoles: [
      "ENUMERATOR",
      "SYSTEM_ADMIN",
      "ADMIN",
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_TRANSPORT_OPS",
    ],
  },

  {
    label: "Motor Parks",
    href: "/motor-parks",
    icon: "🏗️",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
      "FIELD_INSPECTOR",
      "FINANCE_OFFICER",
      "EXTERNAL_APPLICANT",
      "SYSTEM_ADMIN",
      "ADMIN",
      "ENUMERATOR",
    ],
  },

  // ── Mass Transit Module (EPIC-003, future) ──
  {
    label: "Mass Transit",
    href: "/fleet-operators",
    icon: "🚌",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
      "FIELD_INSPECTOR",
      "FINANCE_OFFICER",
      "EXTERNAL_APPLICANT",
      "SYSTEM_ADMIN",
      "ADMIN",
      "ENUMERATOR",
    ],
  },

  // ── Boats & Maritime Module ──
  {
    label: "Boats & Maritime",
    href: "/boats",
    icon: "🚤",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS",
      "FIELD_INSPECTOR",
      "SYSTEM_ADMIN",
      "ADMIN",
      "ENUMERATOR",
    ],
  },

  // ── ICT & Printing Center Module ──
  {
    label: "Printing Center",
    href: "/ict-printing",
    icon: "🖨️",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "ICT_OFFICER",
      "ICT_OFFICER_TRACAS",
      "SYSTEM_ADMIN",
      "ADMIN",
    ],
  },

  // ── Revalidation Module ──
  {
    label: "Revalidation",
    href: "/revalidation",
    icon: "📄",
    allowedRoles: ["EXTERNAL_APPLICANT"],
  },
  {
    label: "Revalidation Queue",
    href: "/admin/revalidation-queue",
    icon: "📄",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      // HOD Operations owns the first half of the chain: scheduling the
      // inspection team and recommending. HOD Parks Revalidation reviews.
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
      "HOD_VIS",
      "FIELD_INSPECTOR",
      "VEHICLE_INSPECTION_OFFICER",
      "SYSTEM_ADMIN",
      "ADMIN",
    ],
  },

  // ── Revenue (EPIC-004, future) ──
  {
    label: "Payments",
    href: "/payments",
    icon: "💳",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "FINANCE_OFFICER",
      "SYSTEM_ADMIN",
      "ADMIN",
    ],
  },

  // ── Inspections queue ──
  {
    label: "Inspections",
    href: "/inspections",
    icon: "🔍",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_PARKS",
      "HOD_VIS",
      "HOD_TRANSPORT_OPS",
      "HOD_PARKS_REVALIDATION",
      "FIELD_INSPECTOR",
      "SYSTEM_ADMIN",
      "ADMIN",
    ],
  },

  // ── AVIR (EPIC-006, future) ──
  // {
  //   label: "AVIR Reports",
  //   href: "/avir",
  //   icon: "🚨",
  //   allowedRoles: [
  //     "COMMISSIONER",
  //     "PERMANENT_SECRETARY",
  //     "VEHICLE_INSPECTION_OFFICER",
  //     "SYSTEM_ADMIN",
  //     "ADMIN",
  //   ],
  // },

  // ── Park Monitors ──
  {
    label: "Park Monitors",
    href: "/admin/park-monitors",
    icon: "👮",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "HOD_PARKS",
      "SYSTEM_ADMIN",
      "ADMIN",
    ],
  },

  // ── Admin ──
  {
    label: "Staff & Users",
    href: "/admin/users",
    icon: "👥",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN", "ADMIN"],
  },
  {
    label: "Audit Trail",
    href: "/admin/audit",
    icon: "📋",
    allowedRoles: [
      "COMMISSIONER",
      "PERMANENT_SECRETARY",
      "SYSTEM_ADMIN",
      "ADMIN",
    ],
  },
  {
    label: "Fee Schedule",
    href: "/admin/fees",
    icon: "💰",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN", "ADMIN"],
  },
  {
    label: "Checklists",
    href: "/admin/checklists",
    icon: "✅",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN", "ADMIN"],
  },
  {
    label: "System Config",
    href: "/admin/config",
    icon: "⚙️",
    allowedRoles: ["SYSTEM_ADMIN"],
  },
  {
    label: "Monitoring",
    href: "/admin/monitoring",
    icon: "📡",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN", "ADMIN"],
  },
  {
    label: "Data Export",
    href: "/admin/export",
    icon: "📤",
    allowedRoles: ["PERMANENT_SECRETARY", "SYSTEM_ADMIN"],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

// Nav items shown to EXTERNAL_APPLICANT per their registered service
const APPLICANT_SERVICE_ROUTES: Record<string, string[]> = {
  MOTOR_PARK: ["/dashboard", "/motor-parks"],
  MASS_TRANSIT: ["/dashboard", "/fleet-operators"],
  REVALIDATION: ["/dashboard", "/revalidation"],
};

export function DashboardSidebar({
  role,
  registeredService,
}: {
  role: UserRole;
  userId: string;
  registeredService?: string | null;
}) {
  const pathname = usePathname();
  const { isOpen, close } = useMobileMenu();

  const visibleItems = NAV_ITEMS.filter((item) => {
    // TRACAS visibility comes from the shared tab definition, so the sidebar
    // and the tab bar can never disagree about who gets in.
    if (item.href === TRACAS_HUB_PLACEHOLDER) {
      return hasTracasAccess(role);
    }
    if (
      (role === "ICT_OFFICER" || role === "ICT_OFFICER_TRACAS") &&
      item.href === "/dashboard"
    ) {
      return false;
    }
    // Enumerators land on /enumerator instead of the generic dashboard.
    if (role === "ENUMERATOR" && item.href === "/dashboard") {
      return false;
    }
    // The TRACAS MD lands on her approvals dashboard.
    if (role === "TRACAS_MD" && item.href === "/dashboard") {
      return false;
    }
    if (item.allowedRoles !== "ALL" && !item.allowedRoles.includes(role)) {
      return false;
    }
    // For external applicants, further restrict by their registered service(s)
    if (role === "EXTERNAL_APPLICANT" && registeredService) {
      const services = registeredService
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const allowed = new Set<string>();

      services.forEach((service) => {
        const routes = APPLICANT_SERVICE_ROUTES[service];
        routes?.forEach((route) => allowed.add(route));
      });

      if (allowed.size > 0 && !allowed.has(item.href)) return false;
    }
    return true;
  });

  return (
    <>
      {/* Dark Backdrop Overlay for Mobile Drawer */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs md:hidden animate-in fade-in duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "w-(--sidebar-width,260px) h-full bg-card border-r border-border/50 flex flex-col overflow-y-auto overflow-x-hidden flex-shrink-0 transition-transform duration-300 ease-in-out z-50",
          "fixed inset-y-0 left-0 md:static md:translate-x-0",
          isOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full md:shadow-none",
        )}>
        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              width={100}
              height={100}
              src="/anambra_mot_logo.png"
              alt=""
              quality={100}
              priority
              className="w-10 h-10"
            />

            <div>
              <p
                className="font-bold text-sm text-foreground leading-tight"
                style={{ fontFamily: "var(--font-display)" }}>
                MOT Platform
              </p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[role]}
              </p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={close}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close navigation menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" className="p-3 flex-1">
          <ul className="flex flex-col gap-0.5 list-none m-0 p-0">
            {visibleItems.map((item) => {
              // The TRACAS entry resolves to the first section this role can
              // use, so an approver is never dropped on the fleet register.
              const isTracas = item.href === TRACAS_HUB_PLACEHOLDER;
              const href = isTracas
                ? (tracasLandingFor(role) ?? "/tracas")
                : item.href;

              const isActive = isTracas
                ? TRACAS_SECTION_PREFIXES.some(
                    (p) => pathname === p || pathname.startsWith(`${p}/`),
                  )
                : item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={href}
                    onClick={close}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}>
                    <span aria-hidden="true" className="text-base leading-none">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: version */}
        <div className="px-5 py-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            ISCE Digital Concept · v0.1
          </p>
        </div>
      </aside>
    </>
  );
}
