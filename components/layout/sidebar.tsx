"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Package, Settings, LogOut, Sun, Moon, Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { menuItems } from "@/lib/menu";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading: authLoading, isAdmin, signIn, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const handleSignIn = async () => {
    try {
      await signIn();
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
    <aside className="w-72 bg-bg-card border-r border-border-light fixed left-0 top-0 h-screen overflow-y-auto hidden md:flex flex-col z-50">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border-light">
        <Link href="/" className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-line-green/20 flex items-center justify-center">
            <Package className="w-6 h-6 text-line-green" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">BD2Fondue</h1>
            <p className="text-xs text-text-secondary">Lost & Found</p>
          </div>
        </Link>

        {/* User Section */}
        <div className="bg-bg-secondary rounded-xl p-3">
          {authLoading ? (
            <Loader2 className="w-5 h-5 text-line-green animate-spin mx-auto" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <img
                src={user.photoURL || ""}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm truncate">
                  {user.displayName}
                </p>
                <p className="text-xs text-text-secondary truncate">{user.email}</p>
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
        {isAdmin && (
          <Link href="/admin">
            <div className="px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer">
              <Settings className="w-4 h-4" />
              Admin Panel
            </div>
          </Link>
        )}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="w-full px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-sm font-medium flex items-center gap-2 transition-colors"
        >
          {resolvedTheme === "dark" ? (
            <>
              <Sun className="w-4 h-4" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              Dark Mode
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
