"use client";

import Image from "next/image";
import { MapPin, Calendar, Hash } from "lucide-react";
import { cn, formatThaiDate } from "@/lib/utils";
import type { FoundItem, LostItem } from "@/lib/types";
import type { AdminMatchPair } from "@/lib/match-admin-client";

const CONFIDENCE_LABEL = {
  high: { label: "มั่นใจสูง", className: "bg-[#e8f8ef] text-[#049c42]" },
  medium: { label: "ปานกลาง", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  low: { label: "ต่ำ", className: "bg-[#ECEEF1] text-[#6B7280] dark:bg-gray-700 dark:text-gray-300" },
} as const;

function ItemVisual({
  photoUrl,
  categoryIcon,
  alt,
}: {
  photoUrl?: string | null;
  categoryIcon: string;
  alt: string;
}) {
  if (photoUrl) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#F7F8FA]">
        <Image src={photoUrl} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" unoptimized />
      </div>
    );
  }
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-[#F7F8FA] dark:bg-gray-800">
      <span className="text-5xl" aria-hidden>
        {categoryIcon}
      </span>
    </div>
  );
}

function SideCard({
  kind,
  title,
  location,
  date,
  trackingCode,
  photoUrl,
  categoryIcon,
  meta,
}: {
  kind: "lost" | "found";
  title: string;
  location: string;
  date: Date | string;
  trackingCode: string;
  photoUrl?: string | null;
  categoryIcon: string;
  meta?: string | null;
}) {
  const kindLabel = kind === "lost" ? "ของหาย" : "ของเจอ";
  const kindClass =
    kind === "lost"
      ? "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300"
      : "text-[#049c42] bg-[#e8f8ef] dark:bg-[#06C755]/15 dark:text-[#4ade80]";

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", kindClass)}>
          {kindLabel}
        </span>
        {meta ? <span className="truncate text-xs text-[#9CA3AF]">{meta}</span> : null}
      </div>
      <ItemVisual photoUrl={photoUrl} categoryIcon={categoryIcon} alt={title} />
      <div className="space-y-1.5">
        <h3 className="line-clamp-2 text-base font-semibold text-[#191919] dark:text-white">{title}</h3>
        <p className="flex items-start gap-1.5 text-sm text-[#6B7280]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{location}</span>
        </p>
        <p className="flex items-center gap-1.5 text-sm text-[#6B7280]">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {formatThaiDate(date)}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
          <Hash className="h-3 w-3 shrink-0" />
          {trackingCode}
        </p>
      </div>
    </article>
  );
}

export function MatchComparePanel({
  match,
  getCategoryIcon,
}: {
  match: AdminMatchPair;
  getCategoryIcon: (category?: string) => string;
}) {
  const lost = match.lostItem as LostItem;
  const found = match.foundItem as FoundItem;
  const confidence = CONFIDENCE_LABEL[match.confidence];
  const circumference = 2 * Math.PI * 36;
  const progress = Math.min(1, Math.max(0, match.score)) * circumference;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
      <SideCard
        kind="lost"
        title={lost.itemName}
        location={lost.locationLost}
        date={lost.dateLost}
        trackingCode={lost.trackingCode}
        categoryIcon={getCategoryIcon(lost.category)}
        meta={lost.description}
      />

      <div className="flex flex-col items-center justify-center gap-3 px-2 py-4">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80" aria-hidden>
            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-[#ECEEF1] dark:text-gray-700" />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              className="text-[#06C755] transition-[stroke-dasharray] duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold text-[#191919] dark:text-white">
              {match.scorePercentage}%
            </span>
          </div>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-medium", confidence.className)}>
          {confidence.label}
        </span>
        {match.reasons.length > 0 ? (
          <ul className="flex max-w-[220px] flex-wrap justify-center gap-1.5">
            {match.reasons.slice(0, 4).map((reason) => (
              <li
                key={reason}
                className="rounded-full bg-[#F7F8FA] px-2 py-0.5 text-[11px] text-[#6B7280] dark:bg-gray-800 dark:text-gray-300"
              >
                {reason}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <SideCard
        kind="found"
        title={found.itemName?.trim() || found.description}
        location={found.locationFound}
        date={found.dateFound}
        trackingCode={found.trackingCode}
        photoUrl={found.photoUrl}
        categoryIcon={getCategoryIcon(found.category)}
        meta={[found.brand, found.color].filter(Boolean).join(" · ") || found.description}
      />
    </div>
  );
}
