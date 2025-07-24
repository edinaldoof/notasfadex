
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt";
import { Role } from "@prisma/client"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"],
    error?: "RefreshAccessTokenError";
  }

  interface User {
    role: Role;
  }
}

declare module "jsonwebtoken";

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    role?: Role;
    error?: "RefreshAccessTokenError";
  }
}
