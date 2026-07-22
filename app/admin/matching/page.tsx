"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { useCategories } from "@/contexts/DataContext";
import {
  MATCHABLE_FOUND_STATUSES,
  MATCHABLE_LOST_STATUSES,
} from "@/lib/matching";
import {
  confirmMatchApi,
  fetchItemMatches,
  fetchMatchBatch,
  rejectMatchApi,
  unmatchPairApi,
  type AdminMatchPair,
  type ConfirmedHistoryPair,
  type MatchBatchResponse,
} from "@/lib/match-admin-client";
import { subscribeToFoundItems, subscribeToLostItems } from "@/lib/database";
import type { FoundItem, LostItem } from "@/lib/types";
import { MatchReviewQueue } from "@/components/admin/matching/match-review-queue";
import { ManualMatchPanel } from "@/components/admin/matching/manual-match-panel";
import { MatchedHistoryList } from "@/components/admin/matching/matched-history-list";

type Tab = "queue" | "manual" | "history";
type ConfidenceFilter = "all" | "high" | "medium" | "low";

/** Avoid refetching when remounting / focus churn within TTL */
const BATCH_CACHE_TTL_MS = 60_000;
let batchCache: {
  key: string;
  data: MatchBatchResponse;
  at: number;
} | null = null;

function batchCacheKey(userId: string, useAI: boolean) {
  return `${userId}:${useAI ? "ai" : "plain"}`;
}

export default function AdminMatchingPage() {
  const { user } = useAuth();
  const { showAlert, showConfirm, dialog } = useAppDialog();
  const { getCategoryByValue } = useCategories();

  const [tab, setTab] = useState<Tab>("queue");
  const [useAI, setUseAI] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");

  const [matches, setMatches] = useState<AdminMatchPair[]>([]);
  const [history, setHistory] = useState<ConfirmedHistoryPair[]>([]);
  const [pool, setPool] = useState({ lost: 0, found: 0, highConfidence: 0 });
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [busy, setBusy] = useState(false);
  const [historyBusyKey, setHistoryBusyKey] = useState<string | null>(null);

  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [loadingPoolItems, setLoadingPoolItems] = useState(true);

  const [selectedItem, setSelectedItem] = useState<LostItem | FoundItem | null>(null);
  const [manualMatches, setManualMatches] = useState<AdminMatchPair[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);

  const userRef = useRef(user);
  userRef.current = user;
  const showAlertRef = useRef(showAlert);
  showAlertRef.current = showAlert;
  const useAIRef = useRef(useAI);
  useAIRef.current = useAI;

  const getToken = useCallback(async () => {
    const current = userRef.current;
    if (!current) throw new Error("Not authenticated");
    return current.getIdToken();
  }, []);

  const getCategoryIcon = useCallback(
    (category?: string) => getCategoryByValue(category || "other")?.icon || "📦",
    [getCategoryByValue]
  );

  const applyBatchData = useCallback((data: MatchBatchResponse) => {
    setMatches(data.matches || []);
    setPool(data.pool || { lost: 0, found: 0, highConfidence: 0 });
    setHistory(data.history || []);
    setActiveKey((prev) => {
      if (prev && data.matches.some((m) => m.key === prev)) return prev;
      return data.matches[0]?.key ?? null;
    });
  }, []);

  const loadBatch = useCallback(
    async (options?: { force?: boolean }) => {
      const currentUser = userRef.current;
      if (!currentUser?.uid) return;

      const key = batchCacheKey(currentUser.uid, useAIRef.current);
      const cached = batchCache;
      if (
        !options?.force &&
        cached &&
        cached.key === key &&
        Date.now() - cached.at < BATCH_CACHE_TTL_MS
      ) {
        applyBatchData(cached.data);
        setLoadingBatch(false);
        return;
      }

      // Only show full spinner on first load / forced refresh without warm cache
      if (options?.force || !cached || cached.key !== key) {
        setLoadingBatch(true);
      }

      try {
        const data = await fetchMatchBatch(getToken, { useAI: useAIRef.current });
        batchCache = { key, data, at: Date.now() };
        applyBatchData(data);
      } catch (error) {
        console.error(error);
        void showAlertRef.current({
          title: "โหลดคิวไม่สำเร็จ",
          message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
          variant: "error",
        });
      } finally {
        setLoadingBatch(false);
      }
    },
    [applyBatchData, getToken]
  );

  // Fetch once per user + AI mode — not on tab focus / auth object churn
  useEffect(() => {
    if (!user?.uid) return;
    void loadBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only userId + useAI
  }, [user?.uid, useAI]);

  useEffect(() => {
    let gotLost = false;
    let gotFound = false;
    const done = () => {
      if (gotLost && gotFound) setLoadingPoolItems(false);
    };

    const unsubLost = subscribeToLostItems((items) => {
      setLostItems(
        items.filter(
          (item) =>
            (MATCHABLE_LOST_STATUSES as readonly string[]).includes(item.status) &&
            !item.matchedFoundId
        )
      );
      gotLost = true;
      done();
    });

    const unsubFound = subscribeToFoundItems((items) => {
      setFoundItems(
        items.filter(
          (item) =>
            (MATCHABLE_FOUND_STATUSES as readonly string[]).includes(item.status) &&
            !item.matchedLostId
        )
      );
      gotFound = true;
      done();
    });

    return () => {
      unsubLost();
      unsubFound();
    };
  }, []);

  const filteredMatches = useMemo(() => {
    if (confidenceFilter === "all") return matches;
    return matches.filter((m) => m.confidence === confidenceFilter);
  }, [matches, confidenceFilter]);

  useEffect(() => {
    if (filteredMatches.length === 0) {
      setActiveKey(null);
      return;
    }
    if (!activeKey || !filteredMatches.some((m) => m.key === activeKey)) {
      setActiveKey(filteredMatches[0].key);
    }
  }, [filteredMatches, activeKey]);

  const advanceQueue = useCallback(
    (removedKey: string) => {
      setMatches((prev) => {
        const next = prev.filter((m) => m.key !== removedKey);
        const idx = prev.findIndex((m) => m.key === removedKey);
        const fallback = next[idx] || next[idx - 1] || next[0] || null;
        setActiveKey(fallback?.key ?? null);
        return next;
      });
    },
    []
  );

  const activeMatch =
    filteredMatches.find((m) => m.key === activeKey) || filteredMatches[0] || null;

  const invalidateBatchCache = useCallback(() => {
    batchCache = null;
  }, []);

  const handleConfirm = async (match: AdminMatchPair) => {
    setBusy(true);
    try {
      await confirmMatchApi(getToken, match.lostItem.id, match.foundItem.id);
      invalidateBatchCache();
      advanceQueue(match.key);
      setHistory((prev) => [
        {
          key: match.key,
          lostItem: match.lostItem,
          foundItem: match.foundItem,
          matchedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setPool((p) => ({
        ...p,
        lost: Math.max(0, p.lost - 1),
        found: Math.max(0, p.found - 1),
      }));
      void showAlert({
        title: "จับคู่สำเร็จ",
        message: "อัปเดตสถานะเป็นพร้อมให้เจ้าของมารับแล้ว",
        variant: "success",
      });
    } catch (error) {
      void showAlert({
        title: "จับคู่ไม่สำเร็จ",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (match: AdminMatchPair) => {
    setBusy(true);
    try {
      await rejectMatchApi(getToken, match.lostItem.id, match.foundItem.id);
      invalidateBatchCache();
      advanceQueue(match.key);
    } catch (error) {
      void showAlert({
        title: "ปฏิเสธไม่สำเร็จ",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    if (!activeMatch || filteredMatches.length <= 1) return;
    const idx = filteredMatches.findIndex((m) => m.key === activeMatch.key);
    const next = filteredMatches[(idx + 1) % filteredMatches.length];
    setActiveKey(next.key);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tab !== "queue" || busy || !activeMatch) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const key = e.key.toLowerCase();
      if (key === "c") {
        e.preventDefault();
        void handleConfirm(activeMatch);
      } else if (key === "r") {
        e.preventDefault();
        void handleReject(activeMatch);
      } else if (key === "s") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers close over latest activeMatch via deps below
  }, [tab, busy, activeMatch, filteredMatches]);

  const loadManualMatches = async (type: "lost" | "found", item: LostItem | FoundItem) => {
    setSelectedItem(item);
    setLoadingManual(true);
    setManualMatches([]);
    try {
      const results = await fetchItemMatches(getToken, type, item.id, useAI);
      setManualMatches(results);
    } catch (error) {
      void showAlert({
        title: "ค้นหาคู่ไม่สำเร็จ",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "error",
      });
    } finally {
      setLoadingManual(false);
    }
  };

  const handleUnmatch = async (pair: ConfirmedHistoryPair) => {
    const ok = await showConfirm({
      title: "ถอนจับคู่นี้?",
      message: "รายการจะกลับไปรอจับคู่ใหม่",
    });
    if (!ok) return;
    setHistoryBusyKey(pair.key);
    try {
      await unmatchPairApi(getToken, pair.lostItem.id, pair.foundItem.id);
      setHistory((prev) => prev.filter((h) => h.key !== pair.key));
      await loadBatch({ force: true });
      void showAlert({
        title: "ถอนจับคู่แล้ว",
        message: "รายการกลับสู่สถานะรอจับคู่",
        variant: "success",
      });
    } catch (error) {
      void showAlert({
        title: "ถอนจับคู่ไม่สำเร็จ",
        message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "error",
      });
    } finally {
      setHistoryBusyKey(null);
    }
  };

  const summaryLine = `รอตรวจ ${filteredMatches.length} คู่ · มั่นใจสูง ${
    matches.filter((m) => m.confidence === "high").length
  } · ของหาย ${pool.lost} · ของเจอ ${pool.found}`;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {dialog}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#191919] dark:text-white">
            <Sparkles className="h-6 w-6 text-[#06C755]" />
            จับคู่รายการ
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">{summaryLine}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs text-[#6B7280] dark:border-gray-600 dark:bg-gray-800">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="rounded border-[#E5E7EB] text-[#06C755] focus:ring-[#06C755]"
            />
            ใช้ AI ช่วยจัดอันดับ
          </label>
          <button
            type="button"
            onClick={() => void loadBatch({ force: true })}
            disabled={loadingBatch}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7280] transition hover:bg-[#F7F8FA] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loadingBatch && "animate-spin")} />
            รีเฟรช
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "queue" as const, label: "คิวตรวจ" },
            { id: "manual" as const, label: "เลือกเอง" },
            { id: "history" as const, label: "จับคู่แล้ว" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-[#06C755] text-white"
                : "bg-[#F7F8FA] text-[#6B7280] hover:bg-[#ECEEF1] dark:bg-gray-800 dark:text-gray-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "queue" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1">
            {(["all", "high", "medium", "low"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setConfidenceFilter(level)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  confidenceFilter === level
                    ? "bg-[#191919] text-white dark:bg-white dark:text-[#191919]"
                    : "bg-[#F7F8FA] text-[#6B7280] dark:bg-gray-800"
                )}
              >
                {level === "all"
                  ? "ทั้งหมด"
                  : level === "high"
                    ? "สูง"
                    : level === "medium"
                      ? "กลาง"
                      : "ต่ำ"}
              </button>
            ))}
          </div>

          <MatchReviewQueue
            matches={filteredMatches}
            activeKey={activeKey}
            busy={busy}
            pool={pool}
            loading={loadingBatch}
            onSelect={setActiveKey}
            onConfirm={() => activeMatch && void handleConfirm(activeMatch)}
            onReject={() => activeMatch && void handleReject(activeMatch)}
            onSkip={handleSkip}
            getCategoryIcon={getCategoryIcon}
          />
        </div>
      ) : null}

      {tab === "manual" ? (
        <ManualMatchPanel
          lostItems={lostItems}
          foundItems={foundItems}
          loadingItems={loadingPoolItems}
          loadingMatches={loadingManual}
          matches={manualMatches}
          selected={selectedItem}
          busy={busy}
          onSelectLost={(item) => void loadManualMatches("lost", item)}
          onSelectFound={(item) => void loadManualMatches("found", item)}
          onConfirm={async (match) => {
            await handleConfirm(match);
            setManualMatches((prev) => prev.filter((m) => m.key !== match.key));
          }}
          onReject={async (match) => {
            await handleReject(match);
            setManualMatches((prev) => prev.filter((m) => m.key !== match.key));
          }}
          getCategoryIcon={getCategoryIcon}
        />
      ) : null}

      {tab === "history" ? (
        loadingBatch ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-[#06C755]" />
          </div>
        ) : (
          <MatchedHistoryList
            items={history}
            busyKey={historyBusyKey}
            onUnmatch={(pair) => void handleUnmatch(pair)}
          />
        )
      ) : null}
    </div>
  );
}
