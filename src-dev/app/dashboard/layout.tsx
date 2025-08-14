
'use client';

import type { Metadata } from "next";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Chatbot } from "@/components/dashboard/chatbot";
import SessionHandler from "@/components/auth/session-handler";
import { useAppMode } from "@/contexts/app-mode-context"; 
import { useEffect } from "react";

// export const metadata: Metadata = {
//   title: "Dashboard | Notas Fadex",
//   description: "Gerencie suas notas fiscais",
// };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mode } = useAppMode();

  useEffect(() => {
    // Adiciona ou remove a classe 'dark' do elemento <html>
    if (mode === 'attest') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  return (
      <div className="min-h-screen bg-background text-foreground flex">
        <SessionHandler />
        <div className="hidden lg:flex">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/95 overflow-y-auto">
            {children}
          </main>
          {mode === 'attest' && <Chatbot />}
        </div>
      </div>
  );
}
