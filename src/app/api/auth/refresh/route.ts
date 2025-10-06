
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { auth } from '../../../../auth';

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }
    
    // Encontra a conta associada ao refresh token para obter o providerAccountId (sub)
    const account = await prisma.account.findFirst({
        where: { refresh_token: refreshToken },
        select: { providerAccountId: true }
    });
    
    if (!account) {
        return NextResponse.json({ error: 'Refresh token not found or invalid' }, { status: 401 });
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken as string,
      }),
    });

    const newTokens = await response.json();

    if (!response.ok) {
      console.error("Failed to refresh token from Google:", newTokens);
      // Importante: Se o Google retornar 'invalid_grant', o refresh token expirou.
      // Precisamos invalidar a sessão do usuário.
      if(newTokens.error === 'invalid_grant') {
         await prisma.account.update({
             where: {
                 provider_providerAccountId: {
                     provider: 'google',
                     providerAccountId: account.providerAccountId,
                 }
             },
             data: {
                 refresh_token: null,
                 access_token: null,
                 expires_at: null,
             }
         });
      }
      return NextResponse.json({ error: newTokens.error_description || newTokens.error || 'Failed to refresh token' }, { status: response.status });
    }

    // Atualiza a conta no banco de dados com os novos tokens
    await prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        access_token: newTokens.access_token,
        expires_at: Math.floor(Date.now() / 1000) + newTokens.expires_in,
        refresh_token: newTokens.refresh_token ?? refreshToken, // Usa o novo refresh_token se ele for fornecido
      },
    });

    return NextResponse.json({
        access_token: newTokens.access_token,
        expires_in: newTokens.expires_in,
        refresh_token: newTokens.refresh_token ?? refreshToken,
    }, { status: 200 });

  } catch (error) {
    console.error('[API/AUTH/REFRESH] Error:', error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
