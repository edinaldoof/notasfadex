import type { Metadata } from "next";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Chatbot } from "@/components/dashboard/chatbot";

export const metadata: Metadata = {
  title: "Dashboard | Notas Fadex",
  description: "Gerencie suas notas fiscais",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-white flex">
      <Sidebar />
      <div className="flex-1 flex flex-col relative">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/95">{children}</main>
        <Chatbot />
      </div>
    </div>
  );
}
