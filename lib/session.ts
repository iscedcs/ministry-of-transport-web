/**
 * Session Management — Ministry of Transport Platform
 * Reference: docs/ROLES_AND_DUTIES.md | node_modules/next/dist/docs/01-app/02-guides/authentication.md
 *
 * Stateless JWT sessions stored in HttpOnly cookies (7-day expiry, auto-refreshed on activity).
 * Session payload is minimal — contains only what's needed for RLS and routing decisions.
 * All sensitive operations re-verify from database; session is used for identity only.
 *
 * STORY-006: Auth framework | STORY-007: Login flows
 */
import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

// ==================== SESSION PAYLOAD ====================

/**
 * Minimum payload stored in the JWT cookie.
 * Do NOT include: email, phone, personal details — session is for identity + routing only.
 * Reference: docs/ROLES_AND_DUTIES.md (7 roles, departmentId for HOD routing)
 */
export interface SessionPayload {
  userId: string;
  role: UserRole;
  departmentId?: string; // For HOD roles: "parks" | "vis" | "transport-ops" | "parks-revalidation" | "finance" | "security" | "towing"
  expiresAt: Date;
}

// ==================== ENCRYPTION ====================

const SESSION_COOKIE = "mot-session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret)
    throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Encrypt a session payload into a signed JWT string.
 */
export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

/**
 * Decrypt and verify a JWT session token.
 * Returns null if the token is invalid or expired.
 */
export async function decrypt(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ==================== COOKIE OPERATIONS ====================

/**
 * Create a new session cookie for the given user.
 * Called after successful login or registration.
 */
export async function createSession(
  payload: Omit<SessionPayload, "expiresAt">,
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encrypt({ ...payload, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Refresh the session cookie (sliding expiry — reset 7-day window on activity).
 * Called in middleware on authenticated requests.
 */
export async function refreshSession(payload: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encrypt({ ...payload, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Delete the session cookie (logout).
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Read and decrypt the current session from the cookie store.
 * Returns null if no session exists or the token is invalid/expired.
 */
export async function getSessionFromCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decrypt(token);
}

/**
 * Read the session cookie value (raw token string) for use in middleware.
 * Middleware cannot call cookies() — reads from the request directly.
 */
export async function decryptFromToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  return decrypt(token);
}
