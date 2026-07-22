"use client";

import { useState, useRef, useEffect, useId } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export default function InfoTooltip({
  content,
  className,
  iconClassName,
  position = "top",
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!isVisible) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        tooltipRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setIsVisible(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVisible(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-text-primary border-l-transparent border-r-transparent border-b-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-text-primary border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-text-primary border-t-transparent border-b-transparent border-r-transparent",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-text-primary border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsVisible((v) => !v)}
        onFocus={() => setIsVisible(true)}
        onBlur={(e) => {
          if (!tooltipRef.current?.contains(e.relatedTarget as Node)) {
            setIsVisible(false);
          }
        }}
        className={cn(
          "inline-flex items-center justify-center min-w-11 min-h-11 -m-2 rounded-full touch-manipulation",
          "text-status-info",
          "hover:bg-status-info-light transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info/40",
          iconClassName
        )}
        aria-label="ข้อมูลเพิ่มเติม"
        aria-expanded={isVisible}
        aria-controls={tooltipId}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded-full",
            "bg-status-info-light"
          )}
        >
          <Info className="w-3.5 h-3.5" aria-hidden />
        </span>
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={cn(
            "absolute z-50 px-3 py-2 text-sm text-white rounded-lg",
            "bg-text-primary max-w-xs whitespace-normal break-words text-pretty",
            "shadow-sm",
            positionClasses[position]
          )}
        >
          {content}
          <span
            className={cn("absolute w-0 h-0 border-4", arrowClasses[position])}
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
