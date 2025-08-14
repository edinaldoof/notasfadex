import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import SessionProvider from '@/components/auth/session-provider';
import { InteractiveBackground } from '@/components/effects/interactive-background';
import { AppModeProvider } from '@/contexts/app-mode-context';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
          <AppModeProvider>
            <InteractiveBackground />
            <SessionProvider>
              {children}
              <Toaster />
            </SessionProvider>
          </AppModeProvider>
      </body>
    </html>
  );
}
