"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { Settings, Shield, LogOut, Sun, Moon, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { menuItems } from "@/lib/menu";
import { getUserPublicEmail, getUserShownName } from "@/lib/user-display";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";
import { AUTH_ROUTES } from "@/lib/auth-routes";

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

  const publicEmail = user ? getUserPublicEmail(appUser, user) : null;

  return (
    <aside className="w-72 bg-bg-card border-r border-border-light fixed left-0 top-0 h-screen overflow-y-auto hidden md:flex flex-col z-50">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border-light">
        <Link href="/home" className="flex items-center gap-3 mb-6">
          <Image
            src="/logo.png"
            alt="Found-U"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-text-primary">Found-U</h1>
            <p className="text-xs text-text-secondary">Lost & Found</p>
          </div>
        </Link>

        {/* User Section */}
        <div className="bg-bg-secondary rounded-xl p-3 min-h-[3.75rem]">
          {authLoading ? (
            <div className="flex items-center gap-3" aria-hidden>
              <div className="h-10 w-10 rounded-full bg-bg-tertiary animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 rounded bg-bg-tertiary animate-pulse" />
                <div className="h-3 w-36 rounded bg-bg-tertiary animate-pulse" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <UserAvatar user={user} appUser={appUser} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm truncate">
                  {getUserShownName(appUser, user)}
                </p>
                {publicEmail ? (
                  <p className="text-xs text-text-secondary truncate">
                    {publicEmail}
                  </p>
                ) : (
                  <p className="text-xs text-text-tertiary truncate">
                    ยังไม่มีอีเมล
                  </p>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="w-full px-4 py-2 bg-line-green hover:bg-line-green text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "mb-2 px-4 py-3 rounded-lg transition-colors cursor-pointer group",
                  isActive
                    ? "bg-line-green/10"
                    : "bg-bg-secondary hover:bg-bg-tertiary"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive
                        ? "text-line-green"
                        : "text-text-secondary group-hover:text-line-green"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm transition-colors",
                      isActive
                        ? "text-line-green"
                        : "text-text-primary"
                    )}>
                      {item.title}
                    </p>
                    <p className="text-xs text-text-secondary">{item.subtitle}</p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border-light space-y-2">
        {user && (
          <Link href="/settings">
            <div className="px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer">
              <Settings className="w-4 h-4" />
              ตั้งค่า
            </div>
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin">
            <div className="px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer">
              <Shield className="w-4 h-4" />
              Admin Panel
            </div>
          </Link>
        )}
        <button
          onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
          className="w-full px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-sm font-medium flex items-center gap-2 transition-colors"
          aria-label="สลับโหมดสว่าง/มืด"
        >
          {themeMounted ? (
            isDarkTheme ? (
              <>
                <Sun className="w-4 h-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Dark Mode
              </>
            )
          ) : (
            <>
              <span className="w-4 h-4 shrink-0" aria-hidden />
              โหมดสี
            </>
          )}
        </button>
        {user && (
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 rounded-lg bg-status-error-light hover:bg-status-error/10 text-status-error text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        )}
      </div>
    </aside>
  );
}
