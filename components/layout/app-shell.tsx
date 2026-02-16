"use client";

import Sidebar from "@/components/layout/sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <Sidebar />
      <main className="md:pl-72 min-h-screen transition-all duration-300">
        <div className="w-full min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
