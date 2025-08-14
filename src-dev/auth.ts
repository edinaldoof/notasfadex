
import type { NextAuthConfig } from 'next-auth';
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '@/lib/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';

// Função auxiliar para renovar o token de acesso
async function refreshAccessToken(token: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    const newTokens = await response.json();

    if (!response.ok) {
      // Se a rota da API falhar (p.ex., o refresh token é inválido), propaga o erro.
      throw new Error(newTokens.error || 'Failed to refresh token');
    }

    // Retorna o novo token com as informações atualizadas
    return {
      ...token,
      accessToken: newTokens.access_token,
      accessTokenExpires: Date.now() + newTokens.expires_in * 1000,
      refreshToken: newTokens.refresh_token ?? token.refreshToken,
      error: null, // Limpa qualquer erro anterior
    };

  } catch (error) {
    console.error("Error refreshing access token", error);
    // Retorna o token original com um erro para o cliente saber que falhou
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}


export const authConfig = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope:
            'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.send',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!profile?.email) {
        return false;
      }
      
      const allowedDomain = process.env.GOOGLE_HOSTED_DOMAIN;
      if (allowedDomain && !profile.email.endsWith(`@${allowedDomain}`)) {
          console.warn(`[Auth] Blocked: Email ${profile.email} does not belong to the allowed domain.`);
          return false; 
      }
      
      return true;
    },
    
    async jwt({ token, user, account, trigger }) {
      // No primeiro login, o objeto 'account' e 'user' estarão disponíveis
      if (account && user) {
        
        // Persiste os tokens OAuth no banco de dados na primeira vez
        // A sintaxe aqui é crítica para evitar o erro P2025
        if (account.provider && account.providerAccountId) {
            const dbAccount = await prisma.account.findUnique({
                 where: {
                    provider_providerAccountId: {
                        provider: account.provider,
                        providerAccountId: account.providerAccountId,
                    },
                }
            });

            if (dbAccount) {
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
            }
        }
        
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = (account.expires_at ?? 0) * 1000;
        token.id = user.id;
        token.sub = account.providerAccountId; // Explicitly set sub to providerAccountId

        const dbUser = await prisma.user.findUnique({ where: { id: user.id }});
        let role = dbUser?.role || 'USER'; 

        const ownerEmail = process.env.OWNER_EMAIL;
        
        // Atribui a role de OWNER ao primeiro usuário ou ao e-mail definido no .env
        const userCount = await prisma.user.count();
        const isOwnerByEmail = ownerEmail && user.email === ownerEmail;
        
        if (isOwnerByEmail && dbUser?.role !== 'OWNER') {
             await prisma.user.update({
                where: { id: user.id },
                data: { role: 'OWNER' }
            });
            role = 'OWNER';
        } else if (userCount === 1 && (!dbUser || dbUser.role !== 'OWNER')) {
            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'OWNER' }
            });
            role = 'OWNER';
        }
        
        token.role = role;
        
        return token;
      }
      
      // Se o token de acesso não expirou, retorna o token atual
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Se o token de acesso expirou, chama a função de renovação
      return refreshAccessToken(token);
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'USER' | 'MANAGER' | 'OWNER';
      }
      // Propaga o erro para a sessão do cliente
      if (token.error) {
        // @ts-ignore
        session.error = token.error;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', 
  },
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig;

export const { auth, signIn, signOut, handlers } = NextAuth(authConfig);
