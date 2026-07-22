"use client";

import { ModeSwitcher } from "@/components/agent/mode-switcher";
import { shellMobileOnly } from "@/components/layout/shell-layout";
import { cn } from "@/lib/utils";

type ManualModeBarProps = {
  className?: string;
};

/** Mobile-only mode switcher — desktop uses Sidebar compact switcher. */
export function ManualModeBar({ className }: ManualModeBarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-40 px-4 py-2.5 shell-desktop:hidden",
        "bg-bg-secondary border-b border-border-light",
        "flex justify-center",
        className
      )}
    >
      <ModeSwitcher variant="compact" />
    </div>
  );
}
