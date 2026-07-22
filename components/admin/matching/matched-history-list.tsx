"use client";

import { Loader2, Undo2 } from "lucide-react";
import { formatThaiDate } from "@/lib/utils";
import type { ConfirmedHistoryPair } from "@/lib/match-admin-client";

export function MatchedHistoryList({
  items,
  busyKey,
  onUnmatch,
}: {
  items: ConfirmedHistoryPair[];
  busyKey: string | null;
  onUnmatch: (pair: ConfirmedHistoryPair) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E5E7EB] px-6 py-12 text-center dark:border-gray-700">
        <p className="text-sm text-[#6B7280]">ยังไม่มีคู่ที่ยืนยันจับคู่</p>
        <p className="mt-1 text-xs text-[#9CA3AF]">เมื่อยืนยันจากคิวตรวจ จะแสดงที่นี่</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[#E5E7EB] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
      {items.map((pair) => {
        const busy = busyKey === pair.key;
        return (
          <li key={pair.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium text-[#191919] dark:text-white">
                {pair.lostItem.itemName}
                <span className="mx-2 text-[#9CA3AF]">↔</span>
                {pair.foundItem.itemName?.trim() || pair.foundItem.description}
              </p>
              <p className="text-xs text-[#9CA3AF]">
                {pair.lostItem.trackingCode} · {pair.foundItem.trackingCode}
                {pair.matchedAt ? ` · ${formatThaiDate(pair.matchedAt)}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onUnmatch(pair)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#6B7280] transition hover:bg-[#F7F8FA] disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
              ถอนจับคู่
            </button>
          </li>
        );
      })}
    </ul>
  );
}
