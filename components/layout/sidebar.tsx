"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { Settings, Shield, LogOut, Sun, Moon, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { menuItems } from "@/lib/menu";
import { getUserShownName } from "@/lib/user-display";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { ModeSwitcher } from "@/components/agent/mode-switcher";
import { shellDesktopOnly, shellSidebarWidth } from "@/components/layout/shell-layout";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, appUser, loading: authLoading, isAdmin, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const themeMounted = useMounted();
  const isDarkTheme = themeMounted && resolvedTheme === "dark";

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
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <aside
      className={cn(
        shellSidebarWidth,
        shellDesktopOnly,
        "bg-bg-card border-r border-border-light fixed left-0 top-0 z-50",
        "h-dvh flex-col overflow-hidden"
      )}
    >
      <div className="shrink-0 flex flex-col gap-4 p-5 border-b border-border-light">
        <Link href="/home" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Found-U"
            width={48}
            height={48}
            className="h-11 w-11 object-contain"
          />
          <div className="min-w-0">
            <h1 className="text-balance text-base font-semibold leading-[1.4] text-text-primary">
              Found-U
            </h1>
            <p className="text-xs leading-[1.3] text-text-secondary">ของหายของเจอ</p>
          </div>
        </Link>

        <div className="flex justify-center">
          <ModeSwitcher variant="compact" />
        </div>

        <div className="bg-bg-secondary rounded-xl p-3 min-h-14 flex items-center">
          {authLoading && !user ? (
            <div className="flex items-center gap-3 w-full" aria-hidden>
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-bg-tertiary motion-reduce:animate-none" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 animate-pulse rounded bg-bg-tertiary motion-reduce:animate-none" />
                <div className="h-3 w-36 animate-pulse rounded bg-bg-tertiary motion-reduce:animate-none" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3 w-full min-w-0">
              <UserAvatar user={user} appUser={appUser} />
              <p className="font-medium text-text-primary text-sm truncate">
                {getUserShownName(appUser, user)}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-line-green-cta px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-line-green-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 focus-visible:ring-offset-2 touch-manipulation"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </div>

      <nav
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1.5 p-3"
        aria-label="เมนูหลัก"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30",
                isActive ? "bg-line-green/10" : "bg-bg-secondary hover:bg-bg-tertiary"
              )}
            >
              <div className="cursor-pointer group px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? "text-line-green"
                        : "text-text-secondary group-hover:text-line-green"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium leading-snug transition-colors",
                        isActive ? "text-line-green" : "text-text-primary"
                      )}
                    >
                      {item.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-text-secondary">{item.subtitle}</p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 flex flex-col gap-1.5 p-3 border-t border-border-light pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {user ? (
          <Link
            href="/settings"
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden />
            ตั้งค่า
          </Link>
        ) : null}
        {isAdmin ? (
          <Link
            href="/admin"
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
          >
            <Shield className="h-4 w-4 shrink-0" aria-hidden />
            แผงผู้ดูแล
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
          className="flex min-h-11 w-full items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 touch-manipulation"
          aria-label="สลับโหมดสว่าง/มืด"
        >
          {themeMounted ? (
            isDarkTheme ? (
              <>
                <Sun className="h-4 w-4 shrink-0" aria-hidden />
                โหมดสว่าง
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 shrink-0" aria-hidden />
                โหมดมืด
              </>
            )
          ) : (
            <>
              <span className="h-4 w-4 shrink-0" aria-hidden />
              โหมดสี
            </>
          )}
        </button>
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2.5 rounded-lg bg-status-error-light hover:bg-status-error/10 text-status-error text-sm font-medium flex items-center gap-2 transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-error/40"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            ออกจากระบบ
          </button>
        ) : null}
      </div>
    </aside>
  );
}
