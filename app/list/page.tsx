"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  MapPin,
  Calendar,
  Loader2,
  Filter,
  ChevronDown,
  Package,
  AlertCircle,
} from "lucide-react";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import AppShell from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";
import { CATEGORIES, STATUS_CONFIG, CONTACT_TYPES, type LostItem, type FoundItem, type ItemStatus } from "@/lib/types";
import { cn, formatThaiDate } from "@/lib/utils";
import { subscribeToLostItems, subscribeToFoundItems, timestampToDate } from "@/lib/firestore";

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

type FilterType = 'all' | 'lost' | 'found';

type CombinedItem = {
  id: string;
  type: 'lost' | 'found';
  name: string;
  description?: string;
  location: string;
  status: ItemStatus;
  category?: string;
  photoUrl?: string;
  contacts?: any[];
  trackingCode: string;
  createdAt: Date;
};

export default function ListPage() {
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    let loadedLost = false;
    let loadedFound = false;

    const checkLoaded = () => {
      if (loadedLost && loadedFound) {
        setLoading(false);
      }
    };

    const unsubLost = subscribeToLostItems((items) => {
      setLostItems(items);
      loadedLost = true;
      checkLoaded();
    });

    const unsubFound = subscribeToFoundItems((items) => {
      setFoundItems(items);
      loadedFound = true;
      checkLoaded();
    });

    return () => {
      unsubLost();
      unsubFound();
    };
  }, []);

  // Combine and filter items
  const combinedItems: CombinedItem[] = [
    ...lostItems.map((item) => ({
      id: item.id,
      type: 'lost' as const,
      name: item.itemName,
      description: item.description,
      location: item.locationLost,
      status: item.status,
      category: item.category,
      contacts: item.contacts,
      trackingCode: item.trackingCode,
      createdAt: toDate(item.createdAt),
    })),
    ...foundItems.map((item) => ({
      id: item.id,
      type: 'found' as const,
      name: item.description,
      description: item.description,
      location: item.locationFound,
      status: item.status,
      photoUrl: item.photoUrl,
      contacts: item.finderContacts,
      trackingCode: item.trackingCode,
      createdAt: toDate(item.createdAt),
    })),
  ]
    .filter((item) => {
      // Security: Hide found items from public (unless admin)
      if (!isAdmin && item.type === 'found') return false;

      // Type filter
      if (filter !== 'all' && item.type !== filter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchLocation = item.location.toLowerCase().includes(query);
        const matchCode = item.trackingCode.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchLocation && !matchCode) return false;
      }

      // Category filter (only for lost items)
      if (categoryFilter && item.type === 'lost' && item.category !== categoryFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const getCategoryIcon = (category?: string) => {
    if (!category) return "📦";
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || "📦";
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-bg-secondary pb-24 md:pb-8 transition-colors">
        <div className="md:hidden">
          <Header title="รายการทั้งหมด" showBack />
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block px-8 py-6 border-b border-border-light bg-bg-secondary sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-text-primary">รายการทั้งหมด</h1>
          <p className="text-text-secondary text-sm mt-1">รายการของหายและของที่เจอทั้งหมดในระบบ</p>
        </div>

        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6">
          {/* Filter Tabs - Only show if Admin */}
          {isAdmin && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  filter === 'all'
                    ? "bg-[#06C755] text-white"
                    : "bg-bg-card text-text-secondary border border-border-light"
                )}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setFilter('lost')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  filter === 'lost'
                    ? "bg-red-500 text-white"
                    : "bg-bg-card text-text-secondary border border-border-light"
                )}
              >
                🔍 ของหายทั้งหมด
              </button>
              <button
                onClick={() => setFilter('found')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  filter === 'found'
                    ? "bg-[#06C755] text-white"
                    : "bg-bg-card text-text-secondary border border-border-light"
                )}
              >
                📦 เจอของทั้งหมด
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา..."
                className="w-full h-12 pl-10 pr-4 bg-bg-card rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-[#06C755] border border-border-light"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-12 px-4 rounded-xl flex items-center gap-2 transition-colors",
                showFilters
                  ? "bg-[#06C755] text-white"
                  : "bg-bg-card text-text-secondary border border-border-light"
              )}
            >
              <Filter className="w-5 h-5" />
              <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="bg-bg-card rounded-xl p-4 mb-4 animate-fade-in border border-border-light">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                หมวดหมู่
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-10 px-3 bg-bg-secondary rounded-lg text-text-primary border-0 focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                <option value="">ทั้งหมด</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-text-tertiary mb-4">
            พบ {combinedItems.length} รายการ
          </div>

          {/* Items List */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#06C755] mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">กำลังโหลด...</p>
            </div>
          ) : combinedItems.length === 0 ? (
            <div className="text-center py-12 bg-bg-card rounded-2xl border border-border-light">
              <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-text-tertiary" />
              </div>
              <p className="text-text-secondary font-medium">ไม่พบรายการ</p>
              <p className="text-sm text-text-tertiary mt-1">
                ลองเปลี่ยนตัวกรองหรือคำค้นหา
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {combinedItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-bg-card rounded-xl p-4 hover:shadow-md transition-all border border-border-light hover:border-line-green cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon/Image */}
                    <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                      {item.photoUrl ? (
                        <Image
                          src={item.photoUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        getCategoryIcon(item.category)
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            item.type === 'lost'
                              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                          )}
                        >
                          {item.type === 'lost' ? 'ของหาย' : 'เจอของ'}
                        </span>
                        <span className="text-xs text-gray-400">{item.trackingCode}</span>
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatThaiDate(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
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

                  {/* Contact Info */}
                  {item.contacts && item.contacts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ติดต่อ:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.contacts.map((contact, idx) => {
                          const contactType = CONTACT_TYPES.find(t => t.value === contact.type);
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300"
                            >
                              {contactType?.icon} {contact.value}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Report Found Button (Only for Lost Items) */}
                  {item.type === 'lost' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <Link
                        href="/found"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-[#e8f8ef] dark:bg-[#06C755]/20 text-[#06C755] rounded-lg text-sm font-medium hover:bg-[#d1f0dd] dark:hover:bg-[#06C755]/30 transition-colors"
                      >
                        <AlertCircle className="w-4 h-4" />
                        ฉันเจอของชิ้นนี้
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </AppShell>
  );
}
