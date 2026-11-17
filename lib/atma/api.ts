/**
 * ARTMA backend access — the one place that knows the backend's URL.
 *
 * The ARTMA backend is a separate service (not part of this repo). Two ways
 * to reach it:
 *
 *  - Server code (server actions, NextAuth refresh) calls it directly with
 *    `backendUrl()` — the URL stays server-side.
 *  - Browser code calls `/api/atma/v1/...` (`clientApiPath()`); the proxy
 *    forwards it to the backend and attaches the Bearer token.
 *
 * Env (server-only; never prefix with NEXT_PUBLIC_):
 *   ARTMA_API_URL  origin of the backend, e.g. https://api.example.com
 */
import { ATMA_BACKEND_BASE } from "./routes";

/** Backend origin without a trailing slash; "" when not configured. */
export function backendOrigin(): string {
  return (process.env.ARTMA_API_URL ?? "").replace(/\/+$/, "");
}

/** Absolute backend URL for a backend path like `/api/v1/auth/login`. */
export function backendUrl(path: string): string {
  const origin = backendOrigin();
  if (!origin) {
    throw new Error("ARTMA_API_URL is not configured");
  }
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Browser-facing path for a backend path: `/api/v1/offenses` →
 * `/api/atma/v1/offenses`. Accepts the backend path as the old Atma
 * constants wrote it, so call sites keep their existing `URLS.*` values.
 */
export function clientApiPath(backendPath: string): string {
  const rest = backendPath.replace(/^\/api\/v1(?=\/|$)/, "");
  return `${ATMA_BACKEND_BASE}${rest}`;
}

/** Inverse of `clientApiPath`, used by the proxy to build the backend target. */
export function backendPathFromClient(clientPath: string): string {
  return `/api/v1${clientPath.slice(ATMA_BACKEND_BASE.length)}`;
}
