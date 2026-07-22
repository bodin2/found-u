"use client";

import { useAppMode, type AppMode } from "@/contexts/app-mode-context";
import { cn } from "@/lib/utils";

type ModeSwitcherProps = {
  variant?: "full" | "compact";
  /** Light controls on saturated headers (e.g. home mobile hero) */
  tone?: "default" | "on-accent";
  className?: string;
};

const focusRing = {
  default:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-1",
  onAccent:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-line-green",
};

export function ModeSwitcher({
  variant = "full",
  tone = "default",
  className,
}: ModeSwitcherProps) {
  const { mode, setMode } = useAppMode();
  const onAccent = tone === "on-accent";
  const focus = onAccent ? focusRing.onAccent : focusRing.default;
  const compactPad =
    onAccent
      ? "px-3 py-2 min-h-11"
      : variant === "compact"
        ? "px-3 py-2 min-h-11"
        : "px-3.5 py-2 min-h-11";

  const handleSelect = (next: AppMode) => {
    if (next === mode) return;
    setMode(next, { navigate: true });
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full p-0.5",
        onAccent
          ? "bg-black/10 border border-white/30"
          : "bg-bg-tertiary border border-border-light/60",
        variant === "compact" ? "text-xs" : "text-sm",
        className
      )}
      role="tablist"
      aria-label="สลับโหมดใช้งาน"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "classic"}
        onClick={() => handleSelect("classic")}
        className={cn(
          "rounded-full font-medium transition-colors duration-200 touch-manipulation",
          focus,
          compactPad,
          mode === "classic"
            ? onAccent
              ? "bg-white text-text-on-light"
              : "bg-bg-card text-text-primary"
            : onAccent
              ? "text-white/90 hover:text-white"
              : "text-text-secondary hover:text-text-primary"
        )}
      >
        {variant === "compact" ? "ปกติ" : "โหมดปกติ"}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "agent"}
        onClick={() => handleSelect("agent")}
        className={cn(
          "rounded-full font-medium transition-colors duration-200 touch-manipulation",
          focus,
          compactPad,
          mode === "agent"
            ? onAccent
              ? "bg-white text-line-green-link"
              : "bg-line-green-cta text-white"
            : onAccent
              ? "text-white/90 hover:text-white"
              : "text-text-secondary hover:text-text-primary"
        )}
      >
        {variant === "compact" ? "ผู้ช่วย" : "โหมดผู้ช่วย"}
      </button>
    </div>
  );
}
