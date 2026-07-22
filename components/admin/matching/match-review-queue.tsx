"use client";

import { MatchComparePanel } from "@/components/admin/matching/match-compare-panel";
import { MatchActionBar } from "@/components/admin/matching/match-action-bar";
import { MatchQueueRail } from "@/components/admin/matching/match-queue-rail";
import type { AdminMatchPair } from "@/lib/match-admin-client";
import { Loader2 } from "lucide-react";

export function MatchReviewQueue({
  matches,
  activeKey,
  busy,
  pool,
  loading,
  onSelect,
  onConfirm,
  onReject,
  onSkip,
  getCategoryIcon,
}: {
  matches: AdminMatchPair[];
  activeKey: string | null;
  busy: boolean;
  pool: { lost: number; found: number };
  loading: boolean;
  onSelect: (key: string) => void;
  onConfirm: () => void;
  onReject: () => void;
  onSkip: () => void;
  getCategoryIcon: (category?: string) => string;
}) {
  const active = matches.find((m) => m.key === activeKey) || matches[0] || null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#06C755]" />
        <p className="text-sm text-[#6B7280]">กำลังจัดคิวคู่ที่อาจตรงกัน...</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E5E7EB] px-6 py-16 text-center dark:border-gray-700">
        <p className="text-base font-medium text-[#191919] dark:text-white">ไม่มีคู่รอตรวจตอนนี้</p>
        <p className="mt-2 text-sm text-[#6B7280]">
          ของหายรอจับคู่ {pool.lost} รายการ · ของเจอรอจับคู่ {pool.found} รายการ
        </p>
        <p className="mt-1 text-xs text-[#9CA3AF]">
          ระบบจะเสนอคู่เมื่อมีรายการที่คล้ายกันในช่วง 30 วัน
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
      <div className="space-y-4">
        <MatchComparePanel match={active} getCategoryIcon={getCategoryIcon} />
        <MatchActionBar busy={busy} onReject={onReject} onSkip={onSkip} onConfirm={onConfirm} />
      </div>
      <MatchQueueRail matches={matches} activeKey={active.key} onSelect={onSelect} />
    </div>
  );
}
