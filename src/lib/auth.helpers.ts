import { JWT } from "next-auth/jwt";
import { User, Account } from "next-auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * Refreshes the Google access token using the refresh token.
 * @param token The JWT token containing the refresh token.
 * @returns The updated token with a new access token.
 */
export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

/**
 * Handles user role assignment on initial sign-in.
 * Assigns OWNER role to the first user or a designated admin email.
 * @param user The user object from the auth callback.
 * @returns The assigned role for the user.
 */
export async function handleUserRole(user: User): Promise<Role> {
  const dbUser = await prisma.creator.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  let assignedRole = dbUser?.role || Role.MEMBER;

  const ownerEmail = process.env.OWNER_EMAIL;
  const userCount = await prisma.creator.count();
  const isOwnerByEmail = ownerEmail && user.email === ownerEmail;

  const shouldBeOwner = isOwnerByEmail || userCount === 1;

  if (shouldBeOwner && assignedRole !== Role.OWNER) {
    await prisma.creator.update({
      where: { id: user.id },
      data: { role: Role.OWNER },
    });
    assignedRole = Role.OWNER;
  }

  return assignedRole;
}

/**
 * Persists OAuth token details from the provider to the database.
 * @param account The account object from the auth callback.
 */
export async function persistOAuthTokens(account: Account): Promise<void> {
  if (!account.provider || !account.providerAccountId) return;

  try {
    await prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        access_token: account.access_token,
        expires_at: account.expires_at,
        refresh_token: account.refresh_token,
      },
    });
  } catch (error) {
    console.error("Failed to persist OAuth tokens:", error);
    // It's possible the account doesn't exist yet if the adapter is slow.
    // Depending on the strategy, an upsert might be safer.
    // For now, logging the error is sufficient.
  }
}