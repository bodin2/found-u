"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { Package, ChevronRight, Moon, Sun, LogIn, LogOut, User, Settings } from "lucide-react";
import BottomNav from "@/components/layout/bottom-nav";
import Sidebar from "@/components/layout/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { getUserPublicEmail, getUserShownName } from "@/lib/user-display";
import { UserAvatar } from "@/components/user/user-avatar";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { menuItems } from "@/lib/menu";
import { DashboardListSkeleton } from "@/components/layout/app-shell-skeleton";

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

export default function Home() {
  const { user, appUser, loading: authLoading, isAdmin, logout, appSettings } = useAuth();
  const welcomeName = getUserShownName(appUser, user);
  const { resolvedTheme, setTheme } = useTheme();
  const themeMounted = useMounted();
  const isDarkTheme = themeMounted && resolvedTheme === "dark";

  const [showUserMenu, setShowUserMenu] = useState(false);

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

  return (
    <div className="min-h-screen bg-bg-primary transition-colors">
      {/* ========================================
          MOBILE LAYOUT
          ======================================== */}
      <div className="md:hidden pb-24 min-h-screen bg-bg-primary transition-colors">
        <header className="px-5 pt-6 pb-6 bg-gradient-to-br from-line-green to-line-green">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white/80 text-sm">{greeting} 👋</p>
                <h1 className="text-white text-xl font-semibold min-h-[1.75rem]">
                  {authLoading ? (
                    <span className="inline-block h-5 w-28 rounded bg-white/20 animate-pulse align-middle" aria-hidden />
                  ) : user ? (
                    welcomeName
                  ) : (
                    "Found-U"
                  )}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
                className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
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

              {authLoading ? (
                <div className="w-10 h-10 rounded-full bg-white/20 animate-pulse shrink-0" aria-hidden />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 shrink-0"
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
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-bg-card rounded-xl shadow-card z-50 overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-border-light">
                          <p className="font-medium text-text-primary truncate">
                            {getUserShownName(appUser, user)}
                          </p>
                          {getUserPublicEmail(appUser, user) ? (
                            <p className="text-sm text-text-secondary truncate">
                              {getUserPublicEmail(appUser, user)}
                            </p>
                          ) : (
                            <p className="text-xs text-text-tertiary">
                              ยังไม่มีอีเมล
                            </p>
                          )}
                        </div>
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-bg-secondary"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-4 h-4" />
                          <span>ตั้งค่า</span>
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-bg-secondary"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <User className="w-4 h-4" />
                            <span>Admin Panel</span>
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-status-error hover:bg-bg-secondary"
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
                  onClick={handleSignIn}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-white/90 text-sm">
            ยินดีต้อนรับ!
          </p>
        </header>

        <main className="px-5 -mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {menuItems
              .filter((m) => m.href !== "/home")
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className="bg-bg-card rounded-2xl p-4 shadow-card border border-border-light hover:shadow-md hover:border-border-medium transition-all duration-200 active:scale-[0.98]">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center",
                            item.color
                          )}
                        >
                          <Icon className={cn("w-7 h-7", item.iconColor)} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-text-primary">
                            {item.title}
                          </h3>
                          <p className="text-sm text-text-secondary">{item.subtitle}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-tertiary" />
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>

          <HomeDashboardSection
            userId={user?.uid}
            authLoading={authLoading}
            nfcEnabled={appSettings.nfcEnabled !== false}
            onSignIn={handleSignIn}
          />
        </main>

        <BottomNav />
      </div>

      {/* ========================================
          DESKTOP LAYOUT - Sidebar + Main Content
          ======================================== */}
      <div className="hidden md:flex min-h-screen bg-bg-primary">
        <Sidebar />

        <main className="flex-1 ml-72 bg-bg-secondary px-0 pb-6 pt-0 md:px-8 md:pb-8 xl:px-12 xl:pb-12">
          <header className="bg-bg-card border-b border-border-light sticky top-0 z-10 -mx-6 lg:-mx-8 xl:-mx-12 px-6 lg:px-8 xl:px-12">
            <div className="pt-5 pb-4">
              <h1 className="text-2xl font-bold text-text-primary min-h-[2rem]">
                {greeting}
                <UserNameSlot user={user} welcomeName={welcomeName} />
              </h1>
              <p className="text-text-secondary text-sm mt-0.5">
                ยินดีต้อนรับ!
              </p>
            </div>
          </header>

          <div>
            <HomeDashboardSection
              userId={user?.uid}
              authLoading={authLoading}
              nfcEnabled={appSettings.nfcEnabled !== false}
              onSignIn={handleSignIn}
              className="w-full mt-0"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
