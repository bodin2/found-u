"use client";

import { useState, useRef, useEffect } from "react";
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

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gray-800 dark:border-t-gray-700 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 dark:border-b-gray-700 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gray-800 dark:border-l-gray-700 border-t-transparent border-b-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-gray-800 dark:border-r-gray-700 border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className={cn(
          "inline-flex items-center justify-center w-5 h-5 rounded-full",
          "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
          "hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/30",
          iconClassName
        )}
        aria-label="ข้อมูลเพิ่มเติม"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-50 px-3 py-2 text-sm text-white rounded-lg shadow-lg",
            "bg-gray-800 dark:bg-gray-700 max-w-xs whitespace-normal",
            "animate-fade-in",
            positionClasses[position]
          )}
        >
          {content}
          {/* Arrow */}
          <span
            className={cn(
              "absolute w-0 h-0 border-4",
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  );
}
