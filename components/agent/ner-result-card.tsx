"use client";

import { cn } from "@/lib/utils";

export type NerResultData = {
  item: string;
  description?: string | null;
  location?: string | null;
  time?: string | null;
  category?: string | null;
  target?: "lost" | "found";
  contact?: string | null;
  contactType?: string | null;
  remark?: string | null;
};

type NerResultCardProps = {
  data: NerResultData;
  className?: string;
};

export function NerResultCard({ data, className }: NerResultCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 mb-3 bg-bg-card border border-border-light min-w-0 max-w-full overflow-hidden",
        className
      )}
    >
      <p className="mb-2 text-xs font-medium leading-[1.3] text-line-green">ข้อมูลที่สกัดได้</p>
      <p className="break-words text-base font-medium leading-[1.4] text-text-primary">
        {data.item || "ไม่ระบุชื่อ"}
      </p>
      {data.description ? (
        <p className="mt-1 break-words text-pretty text-base leading-[1.5] text-text-secondary">
          {data.description}
        </p>
      ) : null}
      <div className="mt-2 space-y-0.5 break-words text-xs leading-[1.3] text-text-secondary">
        {data.location ? <p>📍 {data.location}</p> : null}
        {data.time ? <p>🕐 {data.time}</p> : null}
        {data.category ? <p>หมวด: {data.category}</p> : null}
        {data.contact ? (
          <p>
            ติดต่อ: {data.contact}
            {data.contactType ? ` (${data.contactType})` : ""}
          </p>
        ) : null}
        {data.remark ? <p>หมายเหตุ: {data.remark}</p> : null}
      </div>
    </div>
  );
}
