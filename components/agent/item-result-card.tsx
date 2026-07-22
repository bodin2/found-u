"use client";

import Link from "next/link";
import { formatThaiDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { SerializedItem } from "@/lib/agent/item-privacy";

export type { SerializedItem };

type ItemResultCardProps = {
  item: SerializedItem;
  className?: string;
  isNew?: boolean;
};

const statusLabels: Record<string, string> = {
  searching: "กำลังค้นหา",
  pending_room_confirm: "รอส่งห้องบุคคล",
  found: "พบแล้ว",
  claimed: "รับคืนแล้ว",
  expired: "หมดอายุ",
};

export function ItemResultCard({ item, className, isNew }: ItemResultCardProps) {
  const name = item.itemName || item.description || "ไม่ระบุชื่อ";
  const location = item.locationPlaceName || item.location || "-";
  const dateStr = item.dateLost || item.dateFound;
  const dateLabel = dateStr ? formatThaiDate(new Date(dateStr)) : "-";
  const isOwnerView = item.visibility === "owner" || isNew;
  const showTracking = isOwnerView && Boolean(item.trackingCode);

  return (
    <div
      className={cn(
        "rounded-2xl p-4 bg-bg-card border border-border-light",
        // Carousel: fixed card width that never exceeds the chat pane.
        // Desktop grid: fill the column.
        "w-[min(16.25rem,calc(100vw-5.5rem))] max-w-full shrink-0",
        "md:w-auto md:min-w-0 md:max-w-none md:shrink",
        isNew && "ring-2 ring-line-green/40",
        className
      )}
    >
      {isNew ? (
        <p className="text-xs font-semibold text-line-green mb-2">
          แจ้ง{item.type === "lost" ? "ของหาย" : "เจอของ"}สำเร็จ
        </p>
      ) : null}
      {item.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl}
          alt={name}
          className="w-full h-28 object-cover rounded-xl mb-3"
        />
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-base font-medium leading-[1.4] text-text-primary">
          {name}
        </h4>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
            item.type === "lost"
              ? "bg-status-error-light text-status-error"
              : "bg-line-green-light text-line-green"
          )}
        >
          {item.type === "lost" ? "หาย" : "เจอ"}
        </span>
      </div>
      <p className="text-xs text-text-secondary mt-2">
        สถานะ: {statusLabels[item.status || ""] || item.status || "-"}
        {showTracking ? ` · ${item.trackingCode}` : ""}
      </p>
      <p className="text-xs text-text-secondary mt-1 truncate">{location} · {dateLabel}</p>
      <div className="flex gap-2 mt-3 pt-3 border-t border-border-light/60">
        {showTracking ? (
          <Link
            href={`/tracking?code=${encodeURIComponent(item.trackingCode!)}`}
            className="flex-1 inline-flex items-center justify-center min-h-11 text-center text-sm font-medium px-3 py-2 rounded-full bg-line-green-cta text-white hover:bg-line-green-cta-hover transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 focus-visible:ring-offset-2"
          >
            ติดตามรหัส
          </Link>
        ) : null}
        <Link
          href="/list"
          className={cn(
            "inline-flex items-center justify-center min-h-11 text-center text-sm font-medium px-3 py-2 rounded-full bg-bg-tertiary text-text-primary hover:bg-bg-secondary transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30",
            showTracking ? "flex-1" : "w-full"
          )}
        >
          ดูรายการ
        </Link>
      </div>
    </div>
  );
}
