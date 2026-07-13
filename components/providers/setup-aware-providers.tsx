"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/contexts/auth-context";
import { AppModeProvider } from "@/contexts/app-mode-context";
import { DataProvider } from "@/contexts/DataContext";
import AuthGuard from "@/components/auth/auth-guard";
import { BfcacheRestoreHandler } from "@/components/bfcache-restore-handler";
import { isSetupPublicPath } from "@/lib/auth-routes";

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-secondary transition-colors">
      <div className="w-full bg-bg-primary transition-colors">{children}</div>
    </div>
  );
}

export function SetupAwareProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";

  if (isSetupPublicPath(pathname)) {
    return <AppShell>{children}</AppShell>;
  }

  return (
    <AuthProvider>
      <AppModeProvider>
        <BfcacheRestoreHandler />
        <DataProvider>
          <AuthGuard>
            <AppShell>{children}</AppShell>
          </AuthGuard>
        </DataProvider>
      </AppModeProvider>
    </AuthProvider>
  );
}
