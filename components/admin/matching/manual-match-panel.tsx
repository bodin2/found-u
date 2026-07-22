"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MatchComparePanel } from "@/components/admin/matching/match-compare-panel";
import { MatchActionBar } from "@/components/admin/matching/match-action-bar";
import type { AdminMatchPair } from "@/lib/match-admin-client";
import type { FoundItem, LostItem } from "@/lib/types";

export function ManualMatchPanel({
  lostItems,
  foundItems,
  loadingItems,
  loadingMatches,
  matches,
  selected,
  busy,
  onSelectLost,
  onSelectFound,
  onConfirm,
  onReject,
  getCategoryIcon,
}: {
  lostItems: LostItem[];
  foundItems: FoundItem[];
  loadingItems: boolean;
  loadingMatches: boolean;
  matches: AdminMatchPair[];
  selected: LostItem | FoundItem | null;
  busy: boolean;
  onSelectLost: (item: LostItem) => void;
  onSelectFound: (item: FoundItem) => void;
  onConfirm: (match: AdminMatchPair) => void;
  onReject: (match: AdminMatchPair) => void;
  getCategoryIcon: (category?: string) => string;
}) {
  const [tab, setTab] = useState<"lost" | "found">("lost");
  const [query, setQuery] = useState("");
  const [focusMatch, setFocusMatch] = useState<AdminMatchPair | null>(null);

  const filtered = useMemo(() => {
    const list = tab === "lost" ? lostItems : foundItems;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const name =
        tab === "lost"
          ? (item as LostItem).itemName
          : (item as FoundItem).itemName || (item as FoundItem).description;
      const loc =
        tab === "lost"
          ? (item as LostItem).locationLost
          : (item as FoundItem).locationFound;
      return (
        item.trackingCode?.toLowerCase().includes(q) ||
        name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        loc?.toLowerCase().includes(q)
      );
    });
  }, [tab, lostItems, foundItems, query]);

  const activeMatch = focusMatch || matches[0] || null;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-[#E5E7EB] bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="flex border-b border-[#E5E7EB] dark:border-gray-700">
          {(["lost", "found"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setFocusMatch(null);
              }}
              className={cn(
                "flex-1 px-3 py-2.5 text-sm font-medium",
                tab === t
                  ? "border-b-2 border-[#06C755] text-[#191919] dark:text-white"
                  : "text-[#6B7280]"
              )}
            >
              {t === "lost" ? `ของหาย (${lostItems.length})` : `ของเจอ (${foundItems.length})`}
            </button>
          ))}
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา..."
              className="w-full rounded-xl bg-[#F7F8FA] py-2 pl-9 pr-3 text-sm outline-none ring-[#06C755] focus:ring-2 dark:bg-gray-800"
            />
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {loadingItems ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#06C755]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#9CA3AF]">ไม่พบรายการ</p>
          ) : (
            filtered.map((item) => {
              const active = selected?.id === item.id;
              const title =
                tab === "lost"
                  ? (item as LostItem).itemName
                  : (item as FoundItem).itemName || (item as FoundItem).description;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFocusMatch(null);
                    if (tab === "lost") onSelectLost(item as LostItem);
                    else onSelectFound(item as FoundItem);
                  }}
                  className={cn(
                    "w-full border-t border-[#E5E7EB] px-4 py-3 text-left transition dark:border-gray-700",
                    active ? "bg-[#e8f8ef] dark:bg-[#06C755]/10" : "hover:bg-[#F7F8FA] dark:hover:bg-gray-800"
                  )}
                >
                  <p className="truncate text-sm font-medium text-[#191919] dark:text-white">{title}</p>
                  <p className="truncate text-xs text-[#9CA3AF]">{item.trackingCode}</p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="space-y-4">
        {!selected ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] px-6 py-16 text-center dark:border-gray-700">
            <p className="text-sm text-[#6B7280]">เลือกรายการทางซ้ายเพื่อดูคู่ที่อาจตรงกัน</p>
          </div>
        ) : loadingMatches ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#06C755]" />
            <p className="text-sm text-[#6B7280]">กำลังค้นหาคู่...</p>
          </div>
        ) : !activeMatch ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] px-6 py-16 text-center dark:border-gray-700">
            <p className="text-sm text-[#6B7280]">ไม่พบคู่ที่คล้ายกันสำหรับรายการนี้</p>
          </div>
        ) : (
          <>
            {matches.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {matches.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setFocusMatch(m)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      (focusMatch?.key || matches[0]?.key) === m.key
                        ? "bg-[#06C755] text-white"
                        : "bg-[#F7F8FA] text-[#6B7280] dark:bg-gray-800"
                    )}
                  >
                    {m.scorePercentage}%
                  </button>
                ))}
              </div>
            ) : null}
            <MatchComparePanel match={activeMatch} getCategoryIcon={getCategoryIcon} />
            <MatchActionBar
              busy={busy}
              onReject={() => onReject(activeMatch)}
              onSkip={() => {
                const idx = matches.findIndex((m) => m.key === activeMatch.key);
                const next = matches[idx + 1] || matches[0];
                if (next && next.key !== activeMatch.key) setFocusMatch(next);
              }}
              onConfirm={() => onConfirm(activeMatch)}
            />
          </>
        )}
      </div>
    </div>
  );
}
