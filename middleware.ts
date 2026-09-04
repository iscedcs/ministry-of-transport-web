/**
 * Route Protection Middleware — Ministry of Transport Platform
 * Reference: node_modules/next/dist/docs/01-app/02-guides/authentication.md
 *            docs/ROLES_AND_DUTIES.md
 *
 * Runs on the Edge Runtime (before every matched request).
 *
 * Responsibilities:
 *  1. Block unauthenticated access to all protected routes → redirect to /login
 *  2. Redirect authenticated users away from auth pages (/login, /register)
 *  3. Refresh sliding session expiry on every authenticated request
 *  4. Role-based route guards for sensitive Ministry-only areas
 *
 * Route classification:
 *  - Public:           /login, /register, /, /unauthorized, /api/webhooks/*
 *  - Authenticated:    /dashboard/* (all roles)
 *  - Ministry-only:    /admin/*, /inspections/*, /staff/*
 *  - Executive-only:   /admin/config/*, /admin/staff/*, /permits/approve/*
 *
 * STORY-006: Auth framework
 */

import { NextRequest, NextResponse } from "next/server";
import { decryptFromToken, refreshSession } from "@/lib/session";

// ==================== ROUTE CONFIGURATION ====================

/** Routes that never require authentication */
const PUBLIC_ROUTES = [
  "/login",
  "/staff/login",
  "/register",
  "/unauthorized",
  "/apply-park-monitor",
  "/services",
  "/verify",
  "/",
  "/sw.js",
  "/manifest.json",
  "/manifest.webmanifest",
];

/** Route prefixes that are entirely public (e.g. webhooks) */
const PUBLIC_PREFIXES = [
  "/register/",
  "/api/webhooks/",
  "/_next/",
  "/favicon.ico",
  "/public/",
  "/verify/",
  "/v/",
  "/icons/",
];

/** Routes restricted to Ministry staff only (not External Applicants) */
const MINISTRY_ONLY_PREFIXES = ["/admin/", "/inspections/", "/staff/"];

/** Routes restricted to Commissioner and Permanent Secretary only */
const EXECUTIVE_ONLY_PREFIXES = [
  "/admin/config/",
  "/admin/staff/",
  "/permits/approve/",
];

const MINISTRY_ROLES = [
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "HOD_PARKS",
  "HOD_VIS",
  "HOD_TRANSPORT_OPS",
  "HOD_PARKS_REVALIDATION",
  "FIELD_INSPECTOR",
  "FINANCE_OFFICER",
  "VEHICLE_INSPECTION_OFFICER",
  "SYSTEM_ADMIN",
  "ADMIN",
  "ICT_OFFICER",
  "ICT_OFFICER_TRACAS",
  "ENUMERATOR",
  "TRACAS_MD",
];

const EXECUTIVE_ROLES = ["COMMISSIONER", "PERMANENT_SECRETARY"];

/**
 * Enumerators are field data-entry staff: they onboard vehicles and drivers
 * across TRACAS, Boats, Motor Parks and Mass Transit, but have no business in
 * administration, revenue, or the approval chain. Ministry-only guards below
 * admit every staff role, so the enumerator's ceiling is set explicitly.
 */
const ENUMERATOR_DENIED_PREFIXES = [
  "/admin/",
  "/payments/",
  "/payment/",
  "/inspections/",
];

/**
 * Per-role ceilings on top of the Ministry-only guard, which otherwise admits
 * every staff role. The TRACAS MD runs the transport company, not the
 * Ministry — she provisions her own TRACAS staff via /tracas-staff and has no
 * business in Ministry administration or revenue.
 */
const ROLE_DENIED_PREFIXES: Record<string, string[]> = {
  ENUMERATOR: ENUMERATOR_DENIED_PREFIXES,
  // Blocked from system-level controls only; everything else stays open.
  // Data Export and system controls stay with the System Admin. The export
  // page is a client component, so the route itself must be blocked.
  ADMIN: ["/admin/config", "/admin/export"],
  TRACAS_MD: ["/admin/", "/payments/", "/payment/", "/inspections/", "/commercial-vehicles"],
  ICT_OFFICER_TRACAS: [
    "/admin/",
    "/payments/",
    "/payment/",
    "/inspections/",
    "/motor-parks/",
    "/fleet-operators/",
    "/boats",
    "/commercial-vehicles",
  ],
};

// ==================== MIDDLEWARE ====================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip middleware for static assets and public API routes
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 2. Read session cookie (raw — middleware cannot call cookies() API)
  const cookieToken = request.cookies.get("mot-session")?.value;
  const session = await decryptFromToken(cookieToken);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthenticated = !!session;

  // 3. Redirect authenticated users away from /login and /register
  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 4. Block unauthenticated access to protected routes
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // From here: user is authenticated
  if (!isAuthenticated) {
    return NextResponse.next();
  }

  // 5. Role guards — Executive-only routes
  if (EXECUTIVE_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!EXECUTIVE_ROLES.includes(session.role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // 6. Role guards — Ministry-only routes
  if (MINISTRY_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!MINISTRY_ROLES.includes(session.role)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // 7. Role guards — per-role ceilings
  const deniedForRole = ROLE_DENIED_PREFIXES[session.role];
  if (deniedForRole?.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // 7. Refresh session (sliding expiry) — updates cookie on every authenticated request
  const response = NextResponse.next();
  await refreshSession(session).catch(() => {});

  return response;
}

// ==================== MATCHER ====================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sw.js, manifest
     * - public folder files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.(?:json|webmanifest)|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
