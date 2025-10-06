import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "./lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  refreshAccessToken,
  handleUserRole,
  persistOAuthTokens,
} from "./lib/auth.helpers";
import { Role } from "@prisma/client";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/gmail.send",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) {
        return false;
      }

      const allowedDomain = process.env.GOOGLE_HOSTED_DOMAIN;
      if (allowedDomain && !profile.email.endsWith(`@${allowedDomain}`)) {
        console.warn(
          `[Auth] Blocked: Email ${profile.email} does not belong to the allowed domain.`
        );
        return false;
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        await persistOAuthTokens(account);

        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = (account.expires_at ?? 0) * 1000;
        token.id = user.id;
        token.role = await handleUserRole(user);
        return token;
      }

      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (session.creator) {
        session.creator.id = token.id as string;
        session.creator.role = token.role as Role;
      }
      if (token.error) {
        // @ts-ignore
        session.error = token.error;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

export const { auth, signIn, signOut, handlers } = NextAuth(authConfig);