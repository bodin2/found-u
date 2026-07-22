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
  subscribeToNfcFoundReportsByOwnerId,
} from "@/lib/database";
import { fetchMyNfcDashboardApi } from "@/lib/nfc-api";
import type { NfcFoundReport } from "@/lib/types";

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
  const [nfcPendingReports, setNfcPendingReports] = useState(0);

  const [itemsLoading, setItemsLoading] = useState(false);
  const [nfcLoading, setNfcLoading] = useState(false);
  const [trackedUserId, setTrackedUserId] = useState(userId);
  const [nfcSession, setNfcSession] = useState<string | null>(null);

  if (userId !== trackedUserId) {
    setTrackedUserId(userId);
    if (!userId) {
      setLostItems([]);
      setFoundItems([]);
      setItemsLoading(false);
    } else {
      setItemsLoading(true);
    }
  }

  const effectiveMainPanel =
    !nfcEnabled && mainPanel === "nfc" ? "items" : mainPanel;
  const nfcSessionKey =
    userId && effectiveMainPanel === "nfc" && nfcEnabled
      ? `${userId}:${effectiveMainPanel}`
      : null;

  if (nfcSessionKey !== nfcSession) {
    setNfcSession(nfcSessionKey);
    setNfcLoading(nfcSessionKey !== null);
  }

  useEffect(() => {
    if (!userId) return;

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
    if (!userId || !nfcEnabled) return;

    let cancelled = false;
    const unsubReports = subscribeToNfcFoundReportsByOwnerId(userId, (reports) => {
      if (!cancelled) {
        setNfcPendingReports(reports.filter((r) => r.status === "pending").length);
      }
    });

    return () => {
      cancelled = true;
      unsubReports();
    };
  }, [userId, nfcEnabled]);

  useEffect(() => {
    if (!userId || effectiveMainPanel !== "nfc" || !nfcEnabled) return;

    let cancelled = false;
    void fetchMyNfcDashboardApi()
      .then((data) => {
        if (!cancelled) {
          setNfcTags(data.tags);
          setNfcPendingReports(
            data.reports.filter((r: NfcFoundReport) => r.status === "pending").length
          );
        }
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
  }, [userId, effectiveMainPanel, nfcEnabled]);

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
      tabs.push({
        id: "nfc",
        label:
          nfcPendingReports > 0
            ? `NFC ของฉัน (${nfcPendingReports > 9 ? "9+" : nfcPendingReports})`
            : "NFC ของฉัน",
        icon: Radio,
      });
    }
    return tabs;
  }, [nfcEnabled, nfcPendingReports]);

  const seeAllHref =
    effectiveMainPanel === "items" ? "/tracking" : "/nfc/my-tags";

  const emptyMessage =
    itemFilter === "all"
      ? "ยังไม่มีรายการของคุณ"
      : itemFilter === "lost"
        ? "ยังไม่มีรายการแจ้งของหาย"
        : "ยังไม่มีรายการแจ้งเจอของ";

  const loading =
    (authLoading && !userId) ||
    (effectiveMainPanel === "items" ? itemsLoading : nfcLoading);

  return (
    <section className={cn("mt-8 min-h-[16rem] w-full max-w-full", className)}>
      <div className="flex flex-col gap-3 mb-4 shell-desktop:flex-row shell-desktop:items-center shell-desktop:justify-between">
        <SegmentedTabs
          value={effectiveMainPanel}
          onChange={setMainPanel}
          items={mainTabs}
          className="mb-0 w-full shell-desktop:flex-1 shell-desktop:max-w-md"
        />
        {userId && (
          <div className="flex items-center gap-2 shrink-0 self-end shell-desktop:self-auto">
            {effectiveMainPanel === "items" && (
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-expanded={filterOpen}
                  aria-haspopup="listbox"
                  aria-label="กรองประเภทรายการ"
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors touch-manipulation",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30",
                    itemFilter !== "all" || filterOpen
                      ? "border-line-green/40 bg-line-green/10 text-line-green"
                      : "border-border-light bg-bg-card text-text-secondary hover:border-border-medium hover:text-text-primary"
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="max-w-[5rem] truncate">{activeFilterLabel}</span>
                </button>

                {filterOpen && (
                  <div
                    role="listbox"
                    className="absolute right-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-border-light bg-bg-card py-1 shadow-card motion-safe:animate-fade-in"
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
                            "flex w-full min-h-11 items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors touch-manipulation",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-line-green/30",
                            active
                              ? "bg-line-green/10 text-line-green"
                              : "text-text-primary hover:bg-bg-secondary"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" aria-hidden />
                          <span className="flex-1 truncate">{label}</span>
                          {active && <Check className="w-4 h-4 shrink-0" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <Link
              href={seeAllHref}
              className="inline-flex min-h-11 items-center gap-0.5 px-2 text-sm font-medium text-line-green-link hover:underline touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 rounded-sm"
            >
              ดูทั้งหมด
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>

      {authLoading && !userId ? (
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
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-line-green-cta px-5 py-2.5 text-sm font-medium text-white hover:bg-line-green-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 focus-visible:ring-offset-2 touch-manipulation"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      ) : loading ? (
        <DashboardListSkeleton rows={3} />
      ) : effectiveMainPanel === "items" ? (
        displayItems.length === 0 ? (
          <div className="rounded-2xl border border-border-light bg-bg-secondary py-8 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-text-tertiary" aria-hidden />
            <p className="mb-4 text-pretty text-base text-text-secondary">{emptyMessage}</p>
            <Link
              href={itemFilter === "found" ? "/found" : "/lost"}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-line-green-cta px-5 py-2.5 text-sm font-medium text-white hover:bg-line-green-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 focus-visible:ring-offset-2 touch-manipulation"
            >
              {itemFilter === "found" ? "แจ้งเจอของ" : "แจ้งของหาย"}
            </Link>
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
                  className="block min-w-0 rounded-xl border border-transparent bg-bg-secondary p-4 transition-colors hover:border-border-light hover:bg-bg-tertiary touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-bg-card flex items-center justify-center text-xl shadow-sm shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-base font-medium leading-[1.4] text-text-primary">
                          {getItemDisplayName(item)}
                        </h4>
                        <span
                          className={cn(
                            "shrink-0 px-2 py-0.5 rounded-full text-xs font-medium",
                            kind === "lost"
                              ? "bg-status-error-light text-status-error"
                              : "bg-line-green-light text-line-green"
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
        <div className="rounded-2xl border border-border-light bg-bg-secondary py-8 text-center">
          <Radio className="mx-auto mb-3 h-10 w-10 text-text-tertiary" aria-hidden />
          <p className="mb-4 text-pretty text-base text-text-secondary">ยังไม่มี NFC Tag</p>
          <Link
            href="/nfc/register"
            className="inline-flex min-h-11 items-center rounded-full bg-line-green-cta px-5 py-2.5 text-sm font-medium text-white hover:bg-line-green-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 focus-visible:ring-offset-2 touch-manipulation"
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
                    <h4 className="truncate text-base font-medium leading-[1.4] text-text-primary">
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
