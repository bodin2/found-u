"use client";

import { cn } from "@/lib/utils";
import type { AdminMatchPair } from "@/lib/match-admin-client";

export function MatchQueueRail({
  matches,
  activeKey,
  onSelect,
}: {
  matches: AdminMatchPair[];
  activeKey: string | null;
  onSelect: (key: string) => void;
}) {
  if (matches.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">คิวถัดไป</p>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {matches.slice(0, 8).map((match, index) => {
          const active = match.key === activeKey;
          return (
            <button
              key={match.key}
              type="button"
              onClick={() => onSelect(match.key)}
              className={cn(
                "min-w-[160px] shrink-0 rounded-xl border px-3 py-2 text-left transition lg:min-w-0",
                active
                  ? "border-[#06C755] bg-[#e8f8ef] dark:bg-[#06C755]/15"
                  : "border-[#E5E7EB] bg-white hover:bg-[#F7F8FA] dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#9CA3AF]">#{index + 1}</span>
                <span className="text-xs font-semibold text-[#191919] dark:text-white">
                  {match.scorePercentage}%
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-[#6B7280]">
                {match.lostItem.itemName}
              </p>
              <p className="truncate text-xs text-[#9CA3AF]">
                ↔ {match.foundItem.itemName?.trim() || match.foundItem.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
