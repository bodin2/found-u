"use client";

// Force dynamic rendering for security (ไม่ prerender static)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Camera, Clock, Package, MapPin, ChevronRight, Moon, Sun, LogIn, LogOut, User, Settings, Loader2, List, CheckCircle } from "lucide-react";
import BottomNav from "@/components/layout/bottom-nav";
import Sidebar from "@/components/layout/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import { getLatestFoundItems, getLatestLostItems, getStats, timestampToDate } from "@/lib/firestore";
import { CATEGORIES, STATUS_CONFIG, type FoundItem, type LostItem } from "@/lib/types";
import { cn, formatThaiDate } from "@/lib/utils";
import { menuItems } from "@/lib/menu";

// Get category icon by checking description
function getCategoryIcon(description: string): string {
  const lowerDesc = description.toLowerCase();
  const category = CATEGORIES.find((cat) => lowerDesc.includes(cat.label.toLowerCase()));
  return category?.icon || "📦";
}

export default function Home() {
  const { user, loading: authLoading, isAdmin, signIn, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [latestLostItems, setLatestLostItems] = useState<LostItem[]>([]);
  const [stats, setStats] = useState({ searching: 0, found: 0, claimed: 0 });
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ดึงชั่วโมงปัจจุบันสำหรับ greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

  // Fetch data from Firebase
  useEffect(() => {
    async function fetchData() {
      try {
        const [lostItems, statsData] = await Promise.all([
          getLatestLostItems(5),
          getStats(),
        ]);
        setLatestLostItems(lostItems);
        setStats(statsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

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
        {/* Header Section - Friendly Greeting */}
        <header className="px-5 pt-6 pb-6 bg-gradient-to-br from-line-green to-line-green">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm">{greeting} 👋</p>
                <h1 className="text-white text-xl font-semibold">BD2Fondue</h1>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="w-5 h-5 text-white" />
                ) : (
                  <Moon className="w-5 h-5 text-white" />
                )}
              </button>

              {/* User Menu */}
              {authLoading ? (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-bg-card rounded-xl shadow-card z-50 overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-border-light">
                          <p className="font-medium text-text-primary truncate">{user.displayName}</p>
                          <p className="text-sm text-text-secondary truncate">{user.email}</p>
                        </div>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-bg-secondary"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings className="w-4 h-4" />
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
            ระบบอยู่ระหว่างการพัฒนา (InDev) หากเจอข้อผิดพลาดของระบบ (บัค) สามารถรายงานเรามาได้เลย Version: 0.1Dev
          </p>
        </header>

        {/* Main Menu Cards */}
        <main className="px-5 -mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {menuItems
              .filter((m) => m.href !== "/")
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

          {/* Latest Items Section */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                ของหายล่าสุด
              </h2>
              <Link
                href="/list"
                className="text-sm text-line-green font-medium hover:underline flex items-center gap-1"
              >
                <List className="w-4 h-4" />
                ดูทั้งหมด
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-line-green" />
              </div>
            ) : latestLostItems.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                ยังไม่มีรายการของหาย
              </div>
            ) : (
              <div className="space-y-3">
                {latestLostItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-bg-secondary rounded-xl p-4 hover:bg-bg-tertiary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bg-card flex items-center justify-center text-xl shadow-sm">
                        {CATEGORIES.find(c => c.value === item.category)?.icon || "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-text-primary truncate">
                          {item.itemName}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{item.locationLost}</span>
                          <span className="mx-1">•</span>
                          <span>
                            {item.createdAt
                              ? formatThaiDate(timestampToDate(item.createdAt as any))
                              : "วันนี้"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium",
                          STATUS_CONFIG[item.status].bgColor,
                          STATUS_CONFIG[item.status].color
                        )}
                      >
                        {STATUS_CONFIG[item.status].label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Stats Section */}
          <section className="mt-8 mb-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg-secondary rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-line-green">{stats.found}</p>
                <p className="text-xs text-text-secondary mt-1">เจอแล้ว</p>
              </div>
              <div className="bg-bg-secondary rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-text-primary">{stats.searching}</p>
                <p className="text-xs text-text-secondary mt-1">รอติดตาม</p>
              </div>
              <div className="bg-bg-secondary rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-status-info">{stats.claimed}</p>
                <p className="text-xs text-text-secondary mt-1">รับคืนแล้ว</p>
              </div>
            </div>
          </section>
        </main>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>

      {/* ========================================
          DESKTOP LAYOUT - Sidebar + Main Content
          ======================================== */}
      <div className="hidden md:flex min-h-screen bg-bg-primary">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 ml-72 bg-bg-secondary px-0 pb-6 pt-0 md:px-8 md:pb-8 xl:px-12 xl:pb-12">
          {/* Top Header */}
          <header className="bg-bg-card border-b border-border-light sticky top-0 z-10 -mx-6 lg:-mx-8 xl:-mx-12 px-6 lg:px-8 xl:px-12">
            <div className="pt-5 pb-4">
              <h1 className="text-2xl font-bold text-text-primary">{greeting}</h1>
              <p className="text-text-secondary text-sm mt-0.5">
                ระบบอยู่ระหว่างการพัฒนา (InDev) หากเจอข้อผิดพลาดของระบบ (บัค) สามารถรายงานเรามาได้เลย Version: 0.1Dev
              </p>
            </div>
          </header>

          {/* Content Grid */}
          <div>
            {/* Stats Section */}
            <section className="w-full py-5 mb-8">
              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-card rounded-2xl p-5 shadow-card border border-border-light">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-status-error-light flex items-center justify-center">
                      <Search className="w-5 h-5 text-status-error" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {latestLostItems.length}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">ของหายทั้งหมด</p>
                </div>

                <div className="bg-bg-card rounded-2xl p-5 shadow-card border border-border-light">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-line-green-light flex items-center justify-center">
                      <Package className="w-5 h-5 text-line-green" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {stats.found}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">เจอแล้ว</p>
                </div>

                <div className="bg-bg-card rounded-2xl p-5 shadow-card border border-border-light">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-status-info-light flex items-center justify-center">
                      <Clock className="w-5 h-5 text-status-info" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {stats.searching}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">รอติดตาม</p>
                </div>

                <div className="bg-bg-card rounded-2xl p-5 shadow-card border border-border-light">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-status-success-light flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-status-success" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {stats.claimed}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">รับคืนแล้ว</p>
                </div>
              </div>
            </section>

            {/* Latest Items Section */}
            <section className="w-full">
              <div className="w-full flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary">
                    ของหายล่าสุด
                  </h2>
                  <p className="text-text-secondary text-sm mt-1">รายการของหายที่เพิ่งมาใหม่</p>
                </div>
                <Link
                  href="/list"
                  className="px-6 py-3 bg-line-green hover:bg-line-green text-white rounded-full font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <List className="w-4 h-4" />
                  ดูทั้งหมด
                </Link>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-line-green" />
                </div>
              ) : latestLostItems.length === 0 ? (
                <div className="text-center py-16 bg-bg-card rounded-3xl text-text-secondary">
                  ยังไม่มีรายการของหาย
                </div>
              ) : (
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 xl:gap-8">
                  {latestLostItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gradient-to-br from-bg-secondary to-bg-card rounded-3xl p-7 lg:p-8 shadow-card hover:shadow-md transition-all duration-300 border border-border-light hover:border-line-green group"
                    >
                      {/* Top Section - Icon & Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-status-error-light to-status-error/20 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                          {CATEGORIES.find(c => c.value === item.category)?.icon || "📦"}
                        </div>
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold",
                            STATUS_CONFIG[item.status].bgColor,
                            STATUS_CONFIG[item.status].color
                          )}
                        >
                          {STATUS_CONFIG[item.status].label}
                        </span>
                      </div>

                      {/* Item Name */}
                      <h3 className="text-lg font-bold text-text-primary mb-1 line-clamp-2">
                        {item.itemName}
                      </h3>
                      <p className="text-xs text-text-secondary uppercase tracking-wider mb-3">
                        {CATEGORIES.find(c => c.value === item.category)?.label || "อื่น ๆ"}
                      </p>

                      {/* Details with Icons */}
                      <div className="space-y-2 mb-4 pb-4 border-b border-border-light">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-status-error-light flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-status-error" />
                          </div>
                          <span className="text-text-primary">{item.locationLost}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-status-info-light flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-status-info" />
                          </div>
                          <span className="text-text-primary">
                            {item.createdAt
                              ? formatThaiDate(timestampToDate(item.createdAt as any))
                              : "วันนี้"}
                          </span>
                        </div>
                      </div>

                      {/* Description if exists */}
                      {item.description && (
                        <p className="text-xs text-text-secondary mb-4 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
