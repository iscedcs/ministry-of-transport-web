/**
 * ARTMA session (NextAuth v5, JWT strategy).
 *
 * This is a SECOND session, deliberately separate from MOT's `mot-session`
 * cookie (lib/session.ts): ARTMA's identity lives in the ARTMA backend, which
 * issues its own access/refresh tokens. The two cannot share a login until the
 * backend can accept an MOT identity (tracked as a follow-up).
 *
 * To keep the two from ever clashing in one browser:
 *   - endpoints live under /api/atma/auth (basePath), not /api/auth
 *   - cookies carry an `atma.` prefix
 *   - the signing secret is ATMA_AUTH_SECRET, never MOT's session secret
 *
 * Env (server-only):
 *   ATMA_AUTH_SECRET  signing secret for the ARTMA session JWT
 *   ARTMA_API_URL     backend origin (used to rotate the refresh token)
 */
import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import { jwtDecode, type JwtPayload } from "jwt-decode";
import authConfig from "./auth.config";
import { backendUrl } from "./api";
import { ATMA_AUTH_BASE } from "./routes";

const REFRESH_PATH = "/api/v1/auth/refresh";

const refreshPromises = new Map<string, Promise<JWT>>();

export async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  const refreshToken = token.refreshToken as string;

  // Several requests can hit expiry at once; share one refresh so the rotating
  // refresh token is not spent twice.
  const inFlight = refreshPromises.get(refreshToken);
  if (inFlight) return inFlight;

  const promise: Promise<JWT> = (async (): Promise<JWT> => {
    try {
      const res = await fetch(backendUrl(REFRESH_PATH), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) throw new Error("Failed to refresh access token");

      const resJson = await res.json();
      const tokenData = resJson.data || resJson;

      if (!tokenData?.accessToken) throw new Error("No access token returned");

      const decoded = jwtDecode<JwtPayload>(tokenData.accessToken);

      return {
        ...token,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken ?? refreshToken,
        expires_at: decoded.exp! * 1000,
        error: undefined,
      };
    } catch (error) {
      console.error("ARTMA refresh token error:", error);
      return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        error: "RefreshAccessTokenError",
      };
    } finally {
      refreshPromises.delete(refreshToken);
    }
  })();

  refreshPromises.set(refreshToken, promise);
  return promise;
}

const secure = process.env.NODE_ENV === "production";
const cookiePrefix = secure ? "__Secure-" : "";
const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure,
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: ATMA_AUTH_BASE,
  secret: process.env.ATMA_AUTH_SECRET,
  // Vercel / the state ICT host terminate TLS in front of the app.
  trustHost: true,
  useSecureCookies: secure,
  session: { strategy: "jwt" },

  cookies: {
    sessionToken: {
      name: `${cookiePrefix}atma.session-token`,
      options: baseCookie,
    },
    callbackUrl: {
      name: `${cookiePrefix}atma.callback-url`,
      options: baseCookie,
    },
    csrfToken: {
      // `__Host-` requires Secure + Path=/ and no Domain; fine in production.
      name: `${secure ? "__Host-" : ""}atma.csrf-token`,
      options: baseCookie,
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in
      if (user) {
        const decoded: JwtPayload = jwtDecode(user.accessToken);

        return {
          ...token,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          otpRequired: user.otpRequired,
          badgeNumber: user.badgeNumber ?? null,
          expires_at: decoded.exp! * 1000,
          sub: user.id || decoded.sub || token.sub,
        };
      }

      // A failed refresh is final: do not hammer the backend with a dead token.
      if (token.error === "RefreshAccessTokenError") return token;

      // Refresh 60 seconds before expiry.
      const expiresAt = token.expires_at as number | undefined;
      const shouldRefresh = expiresAt ? Date.now() >= expiresAt - 60_000 : false;
      if (!shouldRefresh) return token;

      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (token.error) {
        session.error = token.error;
        return session;
      }

      session.user = {
        ...session.user,
        id: token.sub as string,
        role: token.role as string,
        firstName: token.firstName as string,
        lastName: token.lastName as string,
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string,
        otpRequired: token.otpRequired as boolean,
        badgeNumber: (token.badgeNumber as string | null) ?? null,
      };

      return session;
    },
  },

  ...authConfig,
});
