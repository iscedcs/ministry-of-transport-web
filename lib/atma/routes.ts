/**
 * ARTMA module — the single place that knows where ARTMA lives.
 *
 * ARTMA is a module of the MOT platform served from the same host under
 * `/atma/*`. Nothing outside this file (and `lib/atma/api.ts`) should hard-code
 * an ARTMA path, so moving the module later (a prefix change, a subdomain) is a
 * one-line edit.
 */

/** Where the ARTMA pages are mounted. */
export const ATMA_BASE = "/atma";

/** Where ARTMA's server endpoints are mounted. */
export const ATMA_API_BASE = "/api/atma";

/** NextAuth (ARTMA session) endpoints. Kept apart from MOT's own `mot-session`. */
export const ATMA_AUTH_BASE = `${ATMA_API_BASE}/auth`;

/**
 * Browser-facing prefix for the ARTMA backend. A request to
 * `/api/atma/v1/<x>` is forwarded by the proxy to `<backend>/api/v1/<x>`
 * (with the officer's Bearer token attached), so the browser never talks to
 * the backend directly and no backend URL or key is shipped to it.
 */
export const ATMA_BACKEND_BASE = `${ATMA_API_BASE}/v1`;

export const atmaRoutes = {
  home: ATMA_BASE,
  login: `${ATMA_BASE}/login`,
  loginOtp: `${ATMA_BASE}/login/otp`,
  forgotPassword: `${ATMA_BASE}/forgot-password`,
  portal: `${ATMA_BASE}/portal`,
  portalVerifyPayment: `${ATMA_BASE}/portal/verify-payment`,
  officer: {
    root: `${ATMA_BASE}/officer`,
    dashboard: `${ATMA_BASE}/officer/dashboard`,
    offense: `${ATMA_BASE}/officer/offense`,
    history: `${ATMA_BASE}/officer/history`,
    scan: `${ATMA_BASE}/officer/scan`,
    evidence: `${ATMA_BASE}/officer/evidence`,
    settings: `${ATMA_BASE}/officer/settings`,
  },
  admin: {
    root: `${ATMA_BASE}/admin`,
    dashboard: `${ATMA_BASE}/admin/dashboard`,
    offenses: `${ATMA_BASE}/admin/offenses`,
    officers: `${ATMA_BASE}/admin/officers`,
    evidences: `${ATMA_BASE}/admin/evidences`,
    categories: `${ATMA_BASE}/admin/categories`,
    revenue: `${ATMA_BASE}/admin/revenue`,
    audit: `${ATMA_BASE}/admin/audit`,
    settings: `${ATMA_BASE}/admin/settings`,
  },
} as const;

/** True for any ARTMA page or ARTMA API path. */
export function isAtmaPath(pathname: string): boolean {
  return (
    pathname === ATMA_BASE ||
    pathname.startsWith(`${ATMA_BASE}/`) ||
    pathname === ATMA_API_BASE ||
    pathname.startsWith(`${ATMA_API_BASE}/`)
  );
}

/** Where a signed-in ARTMA user lands. */
export function atmaHomeForRole(role: string | undefined): string {
  return role === "ADMIN" || role === "SUPERVISOR"
    ? atmaRoutes.admin.dashboard
    : atmaRoutes.officer.dashboard;
}
