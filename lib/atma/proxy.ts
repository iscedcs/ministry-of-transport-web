/**
 * ARTMA branch of the app proxy (see /proxy.ts, which dispatches here for
 * every `/atma/*` page and `/api/atma/*` endpoint — and for nothing else).
 *
 * Ported from the standalone ARTMA app's proxy, with paths moved under the
 * module prefix:
 *   - guards pages by ARTMA role (OFFICER / SUPERVISOR / ADMIN)
 *   - forwards `/api/atma/v1/*` to the ARTMA backend `/api/v1/*`, attaching
 *     the signed-in officer's Bearer token (the browser never holds the
 *     backend URL or calls it directly)
 *   - lets camera devices call `/api/atma/v1/cameras` with `x-camera-key`
 */
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { backendOrigin, backendPathFromClient, backendUrl } from "./api";
import {
  ATMA_API_BASE,
  ATMA_AUTH_BASE,
  ATMA_BACKEND_BASE,
  ATMA_BASE,
  atmaHomeForRole,
  atmaRoutes,
} from "./routes";

const jsonResponse = (status: number, message: string) =>
  new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { "content-type": "application/json" },
  });

const under = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export const atmaProxy = auth((request) => {
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const isApi = under(pathname, ATMA_API_BASE);

  const user = request.auth?.user as
    | { role?: string; accessToken?: string }
    | undefined;
  const role = user?.role;

  /** Forward to the backend, optionally attaching the officer's token. */
  const forwardToBackend = (attachToken: boolean) => {
    if (!backendOrigin()) {
      return jsonResponse(503, "ARTMA backend is not configured.");
    }
    const target = new URL(
      backendUrl(backendPathFromClient(pathname)) + search,
    );
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("host");
    if (
      attachToken &&
      user?.accessToken &&
      !requestHeaders.has("Authorization")
    ) {
      requestHeaders.set("Authorization", `Bearer ${user.accessToken}`);
    }
    return NextResponse.rewrite(target, { request: { headers: requestHeaders } });
  };

  // NextAuth's own endpoints are served by the route handler, not the backend.
  if (under(pathname, ATMA_AUTH_BASE)) return NextResponse.next();

  // A signed-in ARTMA user on the module's landing page goes straight to work.
  if (pathname === ATMA_BASE && role) {
    return NextResponse.redirect(new URL(atmaHomeForRole(role), request.nextUrl));
  }

  const isPublicPage =
    pathname === ATMA_BASE ||
    under(pathname, atmaRoutes.login) ||
    under(pathname, atmaRoutes.forgotPassword) ||
    under(pathname, atmaRoutes.portal) ||
    under(pathname, `${ATMA_BASE}/vehicle`) ||
    under(pathname, `${ATMA_BASE}/evidence`);

  const isPublicApi =
    under(pathname, `${ATMA_BACKEND_BASE}/auth`) || // login, OTP, register, forgot-password…
    under(pathname, `${ATMA_BACKEND_BASE}/portal`); // public portal lookup + payments

  if (isPublicPage) return NextResponse.next();
  if (isPublicApi) return forwardToBackend(false);

  // Machine-to-machine: camera devices authenticate with a key, not a session.
  const isCameraApi = under(pathname, `${ATMA_BACKEND_BASE}/cameras`);
  const cameraKey = request.headers.get("x-camera-key")?.trim();
  if (isCameraApi && cameraKey) return forwardToBackend(false);

  // Everything else needs an ARTMA session.
  if (!role) {
    if (isApi) return jsonResponse(401, "Authentication required.");
    const loginUrl = new URL(atmaRoutes.login, request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // Role gates
  if (under(pathname, atmaRoutes.admin.root)) {
    if (role !== "SUPERVISOR" && role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(atmaRoutes.officer.dashboard, request.nextUrl),
      );
    }
  }

  if (under(pathname, atmaRoutes.officer.root)) {
    if (role !== "OFFICER" && role !== "SUPERVISOR" && role !== "ADMIN") {
      return NextResponse.redirect(new URL(atmaRoutes.login, request.nextUrl));
    }
  }

  // API authorization
  if (pathname === `${ATMA_BACKEND_BASE}/offenses` && method === "POST") {
    if (role !== "OFFICER" && role !== "SUPERVISOR" && role !== "ADMIN") {
      return jsonResponse(403, "Insufficient permissions.");
    }
  }

  // Cameras without a key reach here (a keyed call returned above).
  if (isCameraApi) return jsonResponse(401, "Camera API key required.");

  // All other backend calls: forward with the officer's Bearer token.
  if (under(pathname, ATMA_BACKEND_BASE)) return forwardToBackend(true);

  return NextResponse.next();
});
