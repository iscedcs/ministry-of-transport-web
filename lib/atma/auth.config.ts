import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { backendUrl } from "./api";

/**
 * ARTMA sign-in provider.
 *
 * The backend authenticates the officer (password + OTP) and hands the browser
 * its tokens. This provider is a PUBLIC endpoint — anyone can POST to
 * /api/atma/auth/callback/token-login — so it must not believe anything the
 * caller says about who they are. The only thing taken from the request is the
 * access token (and its refresh token); the identity and role are read from
 * the backend using that token. A made-up token is rejected by the backend, so
 * no session is minted, and a caller cannot pick their own id or role.
 */
const ME_PATH = "/api/v1/auth/me";

type BackendUser = {
  id?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  badgeNumber?: string | null;
};

async function fetchBackendUser(accessToken: string): Promise<BackendUser | null> {
  try {
    const res = await fetch(backendUrl(ME_PATH), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json();
    // The backend wraps some responses as { data: ... }.
    const user = (body?.data?.user ?? body?.data ?? body?.user ?? body) as BackendUser;
    return user && typeof user === "object" ? user : null;
  } catch (error) {
    console.error("ARTMA token-login: could not verify token with backend", error);
    return null;
  }
}

export default {
  providers: [
    Credentials({
      id: "token-login",
      name: "token-login",

      credentials: {
        accessToken: {},
        refreshToken: {},
      },

      async authorize(credentials) {
        const accessToken =
          typeof credentials?.accessToken === "string" ? credentials.accessToken : "";
        const refreshToken =
          typeof credentials?.refreshToken === "string" ? credentials.refreshToken : "";
        if (!accessToken || !refreshToken) return null;

        // Fail closed: no backend answer, no session.
        const user = await fetchBackendUser(accessToken);
        if (!user?.id || !user.email || !user.role) return null;

        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          accessToken,
          refreshToken,
          badgeNumber: user.badgeNumber ? String(user.badgeNumber) : null,
          otpRequired: false,
        };
      },
    }),
  ],
} satisfies NextAuthConfig;
