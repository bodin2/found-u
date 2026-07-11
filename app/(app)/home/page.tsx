"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ChevronRight, Moon, Sun, LogIn, LogOut, User, Settings } from "lucide-react";
import BottomNav from "@/components/layout/bottom-nav";
import Sidebar from "@/components/layout/sidebar";
import { ModeSwitcher } from "@/components/agent/mode-switcher";
import { useAuth } from "@/contexts/auth-context";
import { getUserShownName } from "@/lib/user-display";
import { UserAvatar } from "@/components/user/user-avatar";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { menuItems } from "@/lib/menu";
import { DashboardListSkeleton } from "@/components/layout/app-shell-skeleton";
import { shellSidebarInset } from "@/components/layout/shell-layout";

const HomeDashboardSection = dynamic(
  () =>
    import("@/components/home/home-dashboard-section").then(
      (mod) => mod.HomeDashboardSection
    ),
  {
    loading: () => (
      <section className="mt-8 min-h-[16rem]">
        <DashboardListSkeleton rows={3} />
      </section>
    ),
  }
);

function UserNameSlot({
  user,
  welcomeName,
}: {
  user: ReturnType<typeof useAuth>["user"];
  welcomeName: string;
}) {
  if (!user) return null;

  return (
    <span className="inline-block min-w-[4ch]">
      {`, ${welcomeName}`}
    </span>
  );
}

function HomeQuickMenu({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
      {menuItems
        .filter((m) => m.href !== "/home")
        .map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group block rounded-xl min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
            >
              <div className="bg-bg-card rounded-xl p-4 border border-border-light group-hover:border-border-medium transition-colors duration-200 motion-safe:group-active:scale-[0.99]">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0",
                      item.color
                    )}
                  >
                    <Icon className={cn("w-6 h-6 md:w-7 md:h-7", item.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-text-primary">
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-secondary line-clamp-1">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-tertiary shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
    </div>
  );
}

export default function Home() {
  const { user, appUser, loading: authLoading, isAdmin, logout, appSettings } = useAuth();
  const welcomeName = getUserShownName(appUser, user);
  const { resolvedTheme, setTheme } = useTheme();
  const themeMounted = useMounted();
  const isDarkTheme = themeMounted && resolvedTheme === "dark";

  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!showUserMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowUserMenu(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showUserMenu]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

  const handleSignIn = async () => {
    try {
      window.location.assign(AUTH_ROUTES.hub);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const dashboardProps = {
    userId: user?.uid,
    authLoading,
    nfcEnabled: appSettings.nfcEnabled !== false,
    onSignIn: handleSignIn,
  };

  return (
    <div className="min-h-screen bg-bg-primary transition-colors md:flex">
      <Sidebar />

      <div className={cn("flex min-h-screen flex-1 flex-col main-with-bottom-nav min-w-0", shellSidebarInset)}>
        {/* Mobile header — switcher inside the green band */}
        <header className="md:hidden bg-line-green text-white safe-top shrink-0">
          <div className="px-5 pt-5 pb-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-white/90 text-sm leading-snug">{greeting} 👋</p>
                  <h1 className="text-white text-lg font-semibold min-h-[1.5rem] truncate text-balance leading-tight">
                    {authLoading && !user ? (
                      <span
                        className="inline-block h-5 w-28 rounded bg-white/20 animate-pulse align-middle"
                        aria-hidden
                      />
                    ) : user ? (
                      welcomeName
                    ) : (
                      "Found-U"
                    )}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
                  className="flex items-center justify-center min-w-11 min-h-11 rounded-full bg-white/20 hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label="สลับโหมดสว่าง/มืด"
                >
                  {themeMounted ? (
                    isDarkTheme ? (
                      <Sun className="w-5 h-5 text-white" />
                    ) : (
                      <Moon className="w-5 h-5 text-white" />
                    )
                  ) : (
                    <span className="block w-5 h-5" aria-hidden />
                  )}
                </button>

                {authLoading && !user ? (
                  <div className="w-11 h-11 rounded-full bg-white/20 animate-pulse shrink-0" aria-hidden />
                ) : user ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center justify-center w-11 h-11 rounded-full overflow-hidden border-2 border-white/30 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      aria-label="เมนูผู้ใช้"
                      aria-expanded={showUserMenu}
                    >
                      <UserAvatar
                        user={user}
                        appUser={appUser}
                        size={40}
                        className="w-full h-full rounded-full object-cover"
                        iconClassName="w-5 h-5 text-white"
                        fallbackClassName="w-full h-full bg-white/20 text-white"
                      />
                    </button>

                    {showUserMenu && (
                      <>
                        <button
                          type="button"
                          tabIndex={-1}
                          className="fixed inset-0 z-40 cursor-default bg-black/20 md:bg-transparent"
                          onClick={() => setShowUserMenu(false)}
                          aria-label="ปิดเมนูผู้ใช้"
                        />
                        <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2.5rem)] bg-bg-card text-text-primary rounded-xl shadow-card z-50 overflow-hidden animate-fade-in">
                          <div className="p-4 border-b border-border-light">
                            <p className="font-medium text-text-primary truncate">
                              {getUserShownName(appUser, user)}
                            </p>
                          </div>
                          <Link
                            href="/settings"
                            className="flex items-center gap-3 px-4 min-h-11 py-3 text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:bg-bg-secondary"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings className="w-4 h-4" />
                            <span>ตั้งค่า</span>
                          </Link>
                          {isAdmin && (
                            <Link
                              href="/admin"
                              className="flex items-center gap-3 px-4 min-h-11 py-3 text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:bg-bg-secondary"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <User className="w-4 h-4" />
                              <span>Admin Panel</span>
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 min-h-11 py-3 text-status-error hover:bg-status-error-light focus-visible:outline-none focus-visible:bg-status-error-light"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>ออกจากระบบ</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSignIn}
                    className="flex items-center justify-center gap-2 min-h-11 px-4 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 pb-0.5">
              <ModeSwitcher variant="compact" tone="on-accent" />
              <p className="text-white/90 text-sm">ยินดีต้อนรับ!</p>
            </div>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:block bg-bg-card border-b border-border-light sticky top-0 z-20">
          <div className="px-8 xl:px-12 py-6">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="text-sm text-text-secondary mb-1">ยินดีต้อนรับ!</p>
                <h1 className="text-2xl font-semibold text-text-primary min-h-[2rem] text-balance leading-tight">
                  {authLoading && !user ? (
                    <span
                      className="inline-block h-7 w-48 max-w-full rounded bg-bg-tertiary animate-pulse align-middle"
                      aria-hidden
                    />
                  ) : (
                    <>
                      {greeting}
                      <UserNameSlot user={user} welcomeName={welcomeName} />
                    </>
                  )}
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-[1] flex-1 min-w-0 overflow-x-clip bg-bg-secondary px-5 pt-5 pb-6 rounded-t-2xl -mt-3 md:mt-0 md:rounded-none md:px-8 md:pt-8 md:pb-8 xl:px-12 xl:pb-12">
          <HomeQuickMenu className="mb-6 md:hidden" />

          <HomeDashboardSection
            {...dashboardProps}
            className="mt-0 md:mt-0"
          />
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
