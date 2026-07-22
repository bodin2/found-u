"use client";

import { CheckCircle2, SkipForward, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MatchActionBar({
  busy,
  onReject,
  onSkip,
  onConfirm,
}: {
  busy?: boolean;
  onReject: () => void;
  onSkip: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-[#E5E7EB] bg-white/95 px-4 py-4 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 lg:mx-0 lg:rounded-2xl lg:border">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-medium text-[#191919] transition hover:bg-[#F7F8FA] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          ไม่ตรง
          <kbd className="hidden rounded bg-[#ECEEF1] px-1.5 py-0.5 text-[10px] text-[#6B7280] sm:inline dark:bg-gray-700">
            R
          </kbd>
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F7F8FA] px-5 py-3 text-sm font-medium text-[#6B7280] transition hover:bg-[#ECEEF1] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <SkipForward className="h-4 w-4" />
          ข้าม
          <kbd className="hidden rounded bg-white px-1.5 py-0.5 text-[10px] text-[#6B7280] sm:inline dark:bg-gray-700">
            S
          </kbd>
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#06C755] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#05b34d] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          ยืนยันจับคู่
          <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] text-white sm:inline">
            C
          </kbd>
        </button>
      </div>
    </div>
  );
}
