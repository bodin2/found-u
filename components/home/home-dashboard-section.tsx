"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardListSkeleton } from "@/components/layout/app-shell-skeleton";
import {
  MapPin,
  Radio,
  Search,
  Camera,
  ChevronRight,
  LogIn,
  SlidersHorizontal,
  Check,
  ListFilter,
} from "lucide-react";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
  CATEGORIES,
  NFC_TAG_STATUS_CONFIG,
  getItemStatusConfig,
  getItemDisplayName,
  type FoundItem,
  type LostItem,
  type NfcTag,
} from "@/lib/types";
import { cn, formatThaiDate } from "@/lib/utils";
import {
  subscribeToLostItemsByUserId,
  subscribeToFoundItemsByUserId,
} from "@/lib/database";
import { fetchMyNfcDashboardApi } from "@/lib/nfc-api";

const LIST_LIMIT = 5;

type MainPanel = "items" | "nfc";
type ItemFilter = "all" | "lost" | "found";

const ITEM_FILTER_OPTIONS: {
  id: ItemFilter;
  label: string;
  icon: typeof ListFilter;
}[] = [
  { id: "all", label: "ทั้งหมด", icon: ListFilter },
  { id: "lost", label: "ของหาย", icon: Search },
  { id: "found", label: "ของเจอ", icon: Camera },
];

type ListedItem = {
  item: LostItem | FoundItem;
  kind: "lost" | "found";
};

type HomeDashboardSectionProps = {
  userId: string | undefined;
  authLoading: boolean;
  nfcEnabled?: boolean;
  onSignIn?: () => void;
  className?: string;
};

export function HomeDashboardSection({
  userId,
  authLoading,
  nfcEnabled = true,
  onSignIn,
  className,
}: HomeDashboardSectionProps) {
  const [mainPanel, setMainPanel] = useState<MainPanel>("items");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [nfcTags, setNfcTags] = useState<NfcTag[]>([]);

  const [itemsLoading, setItemsLoading] = useState(true);
  const [nfcLoading, setNfcLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLostItems([]);
      setFoundItems([]);
      setItemsLoading(false);
      return;
    }

    setItemsLoading(true);
    const unsubLost = subscribeToLostItemsByUserId(userId, (items) => {
      setLostItems(items);
      setItemsLoading(false);
    });
    const unsubFound = subscribeToFoundItemsByUserId(userId, (items) => {
      setFoundItems(items);
    });

    return () => {
      unsubLost();
      unsubFound();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || mainPanel !== "nfc" || !nfcEnabled) return;

    let cancelled = false;
    setNfcLoading(true);
    fetchMyNfcDashboardApi()
      .then((data) => {
        if (!cancelled) setNfcTags(data.tags);
      })
      .catch(() => {
        if (!cancelled) setNfcTags([]);
      })
      .finally(() => {
        if (!cancelled) setNfcLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, mainPanel, nfcEnabled]);

  useEffect(() => {
    if (!nfcEnabled && mainPanel === "nfc") {
      setMainPanel("items");
    }
  }, [nfcEnabled, mainPanel]);

  useEffect(() => {
    if (!filterOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [filterOpen]);

  const displayItems = useMemo(() => {
    const merged: ListedItem[] = [];
    if (itemFilter === "all" || itemFilter === "lost") {
      merged.push(
        ...lostItems.map((item) => ({ item, kind: "lost" as const }))
      );
    }
    if (itemFilter === "all" || itemFilter === "found") {
      merged.push(
        ...foundItems.map((item) => ({ item, kind: "found" as const }))
      );
    }
    merged.sort((a, b) => {
      const ta = a.item.createdAt?.getTime() ?? 0;
      const tb = b.item.createdAt?.getTime() ?? 0;
      return tb - ta;
    });
    return merged.slice(0, LIST_LIMIT);
  }, [itemFilter, lostItems, foundItems]);

  const displayTags = useMemo(() => nfcTags.slice(0, LIST_LIMIT), [nfcTags]);

  const activeFilterLabel =
    ITEM_FILTER_OPTIONS.find((o) => o.id === itemFilter)?.label ?? "ทั้งหมด";

  const mainTabs = useMemo(() => {
    const tabs: { id: MainPanel; label: string; icon?: typeof Search }[] = [
      { id: "items", label: "รายการของฉัน", icon: Search },
    ];
    if (nfcEnabled) {
      tabs.push({ id: "nfc", label: "NFC ของฉัน", icon: Radio });
    }
    return tabs;
  }, [nfcEnabled]);

  const seeAllHref =
    mainPanel === "items" ? "/tracking" : "/nfc/my-tags";

  const sectionTitle = mainPanel === "items" ? "รายการของฉัน" : "NFC ของฉัน";

  const emptyMessage =
    itemFilter === "all"
      ? "ยังไม่มีรายการของคุณ"
      : itemFilter === "lost"
        ? "ยังไม่มีรายการแจ้งของหาย"
        : "ยังไม่มีรายการแจ้งเจอของ";

  const loading =
    authLoading ||
    (mainPanel === "items" ? itemsLoading : nfcLoading);

  return (
    <section className={cn("mt-8 min-h-[16rem]", className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-text-primary md:text-2xl min-w-0 truncate">
          {sectionTitle}
        </h2>
        {userId && (
          <div className="flex items-center gap-2 shrink-0">
            {mainPanel === "items" && (
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-expanded={filterOpen}
                  aria-haspopup="listbox"
                  aria-label="กรองประเภทรายการ"
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                    itemFilter !== "all" || filterOpen
                      ? "border-line-green/40 bg-line-green/10 text-line-green"
                      : "border-border-light bg-bg-card text-text-secondary hover:text-text-primary hover:border-border-medium"
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline max-w-[5rem] truncate">
                    {activeFilterLabel}
                  </span>
                </button>

                {filterOpen && (
                  <div
                    role="listbox"
                    className="absolute right-0 top-full z-30 mt-1.5 w-44 py-1 bg-bg-card border border-border-light rounded-xl shadow-card animate-fade-in"
                  >
                    {ITEM_FILTER_OPTIONS.map(({ id, label, icon: Icon }) => {
                      const active = itemFilter === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setItemFilter(id);
                            setFilterOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors",
                            active
                              ? "text-line-green bg-line-green/10"
                              : "text-text-primary hover:bg-bg-secondary"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{label}</span>
                          {active && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <Link
              href={seeAllHref}
              className="text-sm text-line-green font-medium hover:underline flex items-center gap-0.5"
            >
              ดูทั้งหมด
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      <SegmentedTabs
        value={mainPanel}
        onChange={setMainPanel}
        items={mainTabs}
        className="mb-4"
      />

      {authLoading ? (
        <DashboardListSkeleton rows={3} />
      ) : !userId ? (
        <div className="text-center py-8 bg-bg-secondary rounded-2xl border border-border-light">
          <p className="text-text-secondary text-sm mb-4">
            เข้าสู่ระบบเพื่อดูรายการของคุณและแท็ก NFC
          </p>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-line-green text-white text-sm font-medium"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      ) : loading ? (
        <DashboardListSkeleton rows={3} />
      ) : mainPanel === "items" ? (
        displayItems.length === 0 ? (
          <div className="text-center py-8 text-text-secondary bg-bg-secondary rounded-2xl">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems.map(({ item, kind }) => {
              const location =
                kind === "lost"
                  ? (item as LostItem).locationLost
                  : (item as FoundItem).locationFound;
              const category = item.category;
              const icon =
                CATEGORIES.find((c) => c.value === category)?.icon || "📦";

              return (
                <Link
                  key={`${kind}-${item.id}`}
                  href="/tracking"
                  className="block bg-bg-secondary rounded-xl p-4 hover:bg-bg-tertiary transition-colors border border-transparent hover:border-border-light"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-bg-card flex items-center justify-center text-xl shadow-sm shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-text-primary truncate">
                          {getItemDisplayName(item)}
                        </h4>
                        <span
                          className={cn(
                            "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium",
                            kind === "lost"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          )}
                        >
                          {kind === "lost" ? "หาย" : "เจอ"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5 flex-wrap">
                        <span className="font-mono">{item.trackingCode}</span>
                        {location && (
                          <>
                            <span className="mx-0.5">•</span>
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{location}</span>
                          </>
                        )}
                        {item.createdAt && (
                          <>
                            <span className="mx-0.5">•</span>
                            <span>{formatThaiDate(item.createdAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                        getItemStatusConfig(item).bgColor,
                        getItemStatusConfig(item).color
                      )}
                    >
                      {getItemStatusConfig(item).label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : displayTags.length === 0 ? (
        <div className="text-center py-8 bg-bg-secondary rounded-2xl">
          <Radio className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary text-sm mb-4">ยังไม่มี NFC Tag</p>
          <Link
            href="/nfc/register"
            className="inline-block px-5 py-2.5 rounded-full bg-line-green text-white text-sm font-medium"
          >
            ลงทะเบียน Tag แรก
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayTags.map((tag) => {
            const cat = CATEGORIES.find((c) => c.value === tag.category);
            const statusCfg = NFC_TAG_STATUS_CONFIG[tag.status];
            return (
              <Link
                key={tag.id}
                href="/nfc/my-tags"
                className="block bg-bg-secondary rounded-xl p-4 hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bg-card flex items-center justify-center text-xl shadow-sm shrink-0">
                    {cat?.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-text-primary truncate">
                      {tag.itemName}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5 font-mono truncate">
                      {tag.id}
                      {tag.registeredAt
                        ? ` • ${formatThaiDate(tag.registeredAt)}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                      statusCfg.bgColor,
                      statusCfg.color
                    )}
                  >
                    {statusCfg.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
