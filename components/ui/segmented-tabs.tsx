"use client";

import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MotionProvider } from "@/components/motion/motion-provider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type SegmentedTabItem<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
};

type SegmentedTabsProps<T extends string> = {
  items: SegmentedTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  size?: "sm" | "md";
};

function SegmentedTabsInner<T extends string>({
  items,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedTabsProps<T>) {
  const reduced = useReducedMotion();
  const layoutId = "segmented-tab-indicator";

  return (
    <div
      className={cn(
        "flex gap-1 p-1 bg-bg-secondary rounded-xl",
        className
      )}
      role="tablist"
    >
      {items.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors z-[1] min-h-11 min-w-0 touch-manipulation",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 focus-visible:ring-inset",
              size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
              active ? "text-line-green" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {active && !reduced && (
              <m.span
                layoutId={layoutId}
                className="absolute inset-0 bg-bg-primary rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {active && reduced && (
              <span className="absolute inset-0 bg-bg-primary rounded-lg shadow-sm" />
            )}
            <span className="relative flex items-center justify-center gap-1.5 min-w-0">
              {Icon && (
                <Icon
                  className={cn("shrink-0", size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")}
                  aria-hidden
                />
              )}
              <span className="truncate">{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedTabs<T extends string>(props: SegmentedTabsProps<T>) {
  return (
    <MotionProvider>
      <SegmentedTabsInner {...props} />
    </MotionProvider>
  );
}
