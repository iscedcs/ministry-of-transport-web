import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * ARTMA sign-in provider. The backend authenticates the officer (password +
 * OTP) and hands the browser its tokens; this provider only mints the
 * NextAuth session from them, it does not verify anything itself.
 */
export default {
  providers: [
    Credentials({
      id: "token-login",
      name: "token-login",

      credentials: {
        id: {},
        email: {},
        role: {},
        firstName: {},
        lastName: {},
        accessToken: {},
        refreshToken: {},
        badgeNumber: {},
      },

      async authorize(credentials) {
        if (!credentials) return null;

        return {
          id: credentials.id as string,
          email: credentials.email as string,
          role: credentials.role as string,
          firstName: credentials.firstName as string,
          lastName: credentials.lastName as string,
          accessToken: credentials.accessToken as string,
          refreshToken: credentials.refreshToken as string,
          badgeNumber:
            credentials.badgeNumber &&
            credentials.badgeNumber !== "null" &&
            credentials.badgeNumber !== ""
              ? (credentials.badgeNumber as string)
              : null,
          otpRequired: false,
        };
      },
    }),
  ],
} satisfies NextAuthConfig;
