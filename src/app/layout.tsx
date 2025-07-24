import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import SessionProvider from '@/components/auth/session-provider';
import SessionHandler from '@/components/auth/session-handler';

export const metadata: Metadata = {
  title: 'Notas Fadex',
  description: 'Sistema de Gestão de Notas Fiscais da Fadex',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
          <SessionProvider>
            <SessionHandler />
            {children}
            <Toaster />
          </SessionProvider>
      </body>
    </html>
  );
}
