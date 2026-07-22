"use client";

import { ItemResultCard } from "@/components/agent/item-result-card";
import type { SerializedItem } from "@/lib/agent/item-privacy";
import { cn } from "@/lib/utils";

type MatchResultCardProps = {
  match: {
    scorePercentage: number;
    confidence: string;
    lostItem: SerializedItem;
    foundItem: SerializedItem;
    reasons?: string[];
  };
  className?: string;
};

export function MatchResultCard({ match, className }: MatchResultCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 bg-bg-card border border-border-light min-w-0 max-w-full overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3 min-w-0">
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-line-green-light text-sm font-semibold text-line-green"
          style={{
            background: `conic-gradient(var(--line-green) ${match.scorePercentage}%, var(--bg-tertiary) 0)`,
          }}
        >
          <span className="absolute inset-1 rounded-full bg-bg-card flex items-center justify-center text-xs">
            {match.scorePercentage}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-base font-medium leading-[1.4] text-text-primary">
            ความน่าจะเป็นคู่กัน
          </p>
          <p className="text-xs text-text-secondary capitalize">{match.confidence}</p>
        </div>
      </div>
      <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1">
        <div className="flex gap-3 w-max max-w-none md:grid md:grid-cols-2 md:gap-3 md:w-full md:max-w-full">
          <ItemResultCard item={match.lostItem} />
          <ItemResultCard item={match.foundItem} />
        </div>
      </div>
    </div>
  );
}
