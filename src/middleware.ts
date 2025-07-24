import NextAuth from 'next-auth';
import { authConfig } from './auth';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/dashboard/:path*'],
};
