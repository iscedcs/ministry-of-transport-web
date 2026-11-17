import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
	interface User {
		id: string;
		role: string;
		firstName: string;
		lastName: string;
		accessToken: string;
		refreshToken: string;
		otpRequired: boolean;
		badgeNumber?: string | null;
	}

	interface Session {
		user: DefaultSession["user"] & {
			role: string;
			firstName: string;
			lastName: string;
			accessToken: string;
			refreshToken: string;
			otpRequired: boolean;
			badgeNumber?: string | null;
		};

		error?: "RefreshAccessTokenError";
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		role?: string;
		firstName?: string;
		lastName?: string;
		accessToken?: string;
		refreshToken?: string;
		otpRequired?: boolean;
		badgeNumber?: string | null;
		expires_at?: number;
		error?: "RefreshAccessTokenError";
	}
}
