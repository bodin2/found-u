"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { thaiCopy } from "@/lib/copy/thai-student";
import type { AgentFallbackPayload } from "@/lib/agent/fallback";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  list: thaiCopy.fallback.list,
  tracking: thaiCopy.fallback.tracking,
  lost: thaiCopy.fallback.lost,
  found: thaiCopy.fallback.found,
};

type TraditionalFallbackPanelProps = {
  payload?: AgentFallbackPayload | null;
  className?: string;
};

export function TraditionalFallbackPanel({
  payload,
  className,
}: TraditionalFallbackPanelProps) {
  const message = payload?.message || thaiCopy.agent.aiDown;

  return (
    <div
      className={cn(
        "rounded-2xl border border-status-warning/30 bg-status-warning-light p-4",
        className
      )}
    >
      <div className="flex gap-3">
        <AlertTriangle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium leading-[1.4] text-text-primary">
            {thaiCopy.fallback.title}
          </h3>
          <p className="mt-1 text-pretty text-base leading-[1.5] text-text-secondary">
            {message}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {(payload?.suggestedRoutes || []).map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="inline-flex min-h-11 items-center rounded-full border border-border-light bg-bg-card px-4 py-2 text-sm font-medium hover:border-line-green/40 hover:text-line-green transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
              >
                {routeLabels[route.labelKey] || route.href}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
