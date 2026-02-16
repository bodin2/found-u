"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import {
  Search,
  Clock,
  CheckCircle2,
  Package,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  User,
} from "lucide-react";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import AppShell from "@/components/layout/app-shell";
import { STATUS_CONFIG, CATEGORIES, CONTACT_TYPES, type ItemStatus, type LostItem } from "@/lib/types";
import { cn, formatThaiDate } from "@/lib/utils";
import { getLostItemByTrackingCode, subscribeToLostItemsByUserId, timestampToDate } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import LoginPrompt from "@/components/auth/login-prompt";

type SearchResult = (LostItem & { matchLocation?: string; icon?: string }) | null;

// Type guard สำหรับตรวจสอบว่าเป็น Timestamp หรือ Date
function isTimestamp(value: any): value is { toDate: () => Date } {
  return value && typeof value.toDate === 'function';
}

// Type guard สำหรับตรวจสอบว่าเป็น Date หรือ Timestamp
function toDate(value: Date | { toDate: () => Date } | undefined): Date {
  if (!value) return new Date();
  if (isTimestamp(value)) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}

export default function TrackingPage() {
  const { user, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [myItems, setMyItems] = useState<LostItem[]>([]);
  const [loadingMyItems, setLoadingMyItems] = useState(true);

  // Real-time subscription สำหรับรายการของฉัน
  useEffect(() => {
    if (!user?.uid) {
      setMyItems([]);
      setLoadingMyItems(false);
      return;
    }

    setLoadingMyItems(true);
    const unsubscribe = subscribeToLostItemsByUserId(user.uid, (items) => {
      setMyItems(items);
      setLoadingMyItems(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || "📦";
  };

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const result = await getLostItemByTrackingCode(searchQuery.toUpperCase());

      if (result) {
        const category = CATEGORIES.find(c => c.value === result!.category);
        setSearchResult({
          ...result,
          icon: category?.icon || "📦",
        });
      } else {
        setSearchResult(null);
      }
    } catch (error) {
      console.error("Error searching:", error);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case "searching":
        return <Clock className="w-5 h-5" />;
      case "found":
        return <CheckCircle2 className="w-5 h-5" />;
      case "claimed":
        return <Package className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  // Show login prompt if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-800 pb-24 transition-colors">
        <Header title="ติดตามสถานะ" showBack />
        <LoginPrompt
          title="เข้าสู่ระบบเพื่อติดตามสถานะ"
          description="คุณต้องเข้าสู่ระบบเพื่อดูรายการของหายของคุณและติดตามสถานะแบบ Real-time"
          feature="รายการของฉันจะอัปเดตอัตโนมัติเมื่อมีคนเจอของ!"
        />
        <BottomNav />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-bg-secondary pb-24 md:pb-8 transition-colors">
        <div className="md:hidden">
          <Header title="ติดตามสถานะ" showBack />
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block px-8 py-6 border-b border-border-light bg-bg-secondary sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-text-primary">ติดตามสถานะ</h1>
          <p className="text-text-secondary text-sm mt-1">ติดตามสถานะของหายและของที่เจอ</p>
        </div>

        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6">
          {/* Search Section */}
          <form onSubmit={handleSearch} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ค้นหาด้วยรหัสติดตาม
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                placeholder="เช่น LF-ABC123"
                className="w-full h-12 px-4 pr-14 bg-bg-card rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-line-green transition-all uppercase border border-border-light"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                  searchQuery.trim()
                    ? "bg-line-green text-white hover:bg-line-green-hover"
                    : "bg-bg-secondary text-text-tertiary"
                )}
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>

          {/* Search Result */}
          {hasSearched && (
            <div className="mb-8 animate-fade-in">
              {searchResult ? (
                <div className="bg-bg-card rounded-2xl overflow-hidden shadow-sm border border-border-light">
                  {/* Status Header */}
                  <div
                    className={cn(
                      "px-4 py-3 flex items-center gap-2",
                      STATUS_CONFIG[searchResult.status]?.bgColor || "bg-gray-100"
                    )}
                  >
                    <span className={STATUS_CONFIG[searchResult.status]?.color || "text-gray-600"}>
                      {getStatusIcon(searchResult.status)}
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        STATUS_CONFIG[searchResult.status]?.color || "text-gray-600"
                      )}
                    >
                      {STATUS_CONFIG[searchResult.status]?.label || "ไม่ทราบสถานะ"}
                    </span>
                  </div>

                  {/* Item Details */}
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
                        {searchResult.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary truncate">
                          {searchResult.itemName}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {searchResult.trackingCode}
                        </p>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <MapPin className="w-4 h-4 text-text-tertiary" />
                        <span>ทำหายที่: {searchResult.locationLost}</span>
                      </div>
                      {searchResult.contacts && searchResult.contacts.length > 0 && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <User className="w-4 h-4 text-text-tertiary" />
                          <span>
                            {searchResult.contacts.map((c, i) => {
                              const contactType = CONTACT_TYPES.find(t => t.value === c.type);
                              return (
                                <span key={i}>
                                  {contactType?.icon} {c.value}
                                  {i < searchResult.contacts!.length - 1 ? ' • ' : ''}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Calendar className="w-4 h-4 text-text-tertiary" />
                        <span>วันที่แจ้ง: {searchResult.createdAt ? formatThaiDate(toDate(searchResult.createdAt)) : "-"}</span>
                      </div>

                      {/* Show match location if found */}
                      {searchResult.status === "found" && (
                        <div className="flex items-center gap-2 text-[#06C755] bg-[#e8f8ef] dark:bg-[#06C755]/20 rounded-lg p-3 mt-3">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="font-medium">
                            พบของแล้ว! กรุณาติดต่อรับคืน
                          </span>
                        </div>
                      )}

                      {searchResult.status === "claimed" && (
                        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-3">
                          <Package className="w-4 h-4" />
                          <span className="font-medium">
                            รับคืนเรียบร้อยแล้ว
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // No Result
                <div className="text-center py-12 bg-bg-card rounded-2xl border border-border-light">
                  <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-text-tertiary" />
                  </div>
                  <p className="text-text-secondary font-medium">ไม่พบข้อมูล</p>
                  <p className="text-sm text-text-tertiary mt-1">
                    กรุณาตรวจสอบรหัสติดตามอีกครั้ง
                  </p>
                </div>
              )}
            </div>
          )}

          {/* My Reports Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                รายการของฉัน
              </h2>
              <span className="text-xs text-text-tertiary">อัปเดตอัตโนมัติ</span>
            </div>

            {/* Loading State */}
            {loadingMyItems ? (
              <div className="text-center py-12 bg-bg-card rounded-2xl border border-border-light">
                <Loader2 className="w-8 h-8 animate-spin text-line-green mx-auto mb-4" />
                <p className="text-text-secondary">กำลังโหลด...</p>
              </div>
            ) : myItems.length > 0 ? (
              /* Items List */
              <div className="space-y-3">
                {myItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSearchQuery(item.trackingCode);
                      const category = CATEGORIES.find(c => c.value === item.category);
                      setSearchResult({
                        ...item,
                        icon: category?.icon || "📦",
                      });
                      setHasSearched(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-bg-card border border-border-light rounded-xl p-4 hover:shadow-md hover:border-line-green transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-xl">
                        {getCategoryIcon(item.category)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-text-primary truncate">
                            {item.itemName}
                          </h4>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {item.trackingCode} • {item.createdAt ? formatThaiDate(toDate(item.createdAt)) : "-"}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0",
                          STATUS_CONFIG[item.status]?.bgColor || "bg-gray-100",
                          STATUS_CONFIG[item.status]?.color || "text-gray-600"
                        )}
                      >
                        {STATUS_CONFIG[item.status]?.label || "ไม่ทราบ"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              /* Empty State */
              <div className="text-center py-12 bg-bg-card rounded-2xl border border-border-light">
                <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-text-tertiary" />
                </div>
                <p className="text-text-secondary font-medium">ยังไม่มีรายการ</p>
                <p className="text-sm text-text-tertiary mt-1">
                  เริ่มแจ้งของหายเพื่อติดตามสถานะ
                </p>
              </div>
            )}
          </section>

          {/* Timeline Legend */}
          <section className="mt-8 p-4 bg-bg-card rounded-xl border border-border-light">
            <h3 className="text-sm font-medium text-text-primary mb-3">
              คำอธิบายสถานะ
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="text-text-secondary">กำลังตามหา - รอดูว่ามีคนเจอ</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-[#06C755]"></span>
                <span className="text-text-secondary">เจอแล้ว - รอติดต่อรับคืน</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-text-secondary">รับคืนแล้ว - ดำเนินการเสร็จสิ้น</span>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </AppShell>
  );
}
