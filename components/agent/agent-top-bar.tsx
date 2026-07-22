"use client";

import { History, RotateCcw, Search } from "lucide-react";
import { ModeSwitcher } from "@/components/agent/mode-switcher";
import { cn } from "@/lib/utils";
import { thaiCopy } from "@/lib/copy/thai-student";

type AgentTopBarProps = {
  status?: string;
  onNewChat?: () => void;
  onOpenHistory?: () => void;
  className?: string;
};

function getSubtitle(status?: string): string {
  if (status === "submitted") return thaiCopy.agent.thinking;
  if (status === "streaming") return thaiCopy.agent.subtitleStreaming;
  return thaiCopy.agent.subtitleIdle;
}

export function AgentTopBar({ status, onNewChat, onOpenHistory, className }: AgentTopBarProps) {
  const isActive = status === "submitted" || status === "streaming";
  const subtitle = getSubtitle(status);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 shrink-0",
        "bg-bg-primary border-b border-border-light",
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative shrink-0">
          <div className="agent-avatar w-9 h-9" aria-hidden>
            <Search className="w-4 h-4" strokeWidth={2.25} />
          </div>
          {isActive ? (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-line-green border-2 border-bg-primary"
              aria-hidden
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-balance text-base font-semibold leading-[1.4] text-text-primary">
            {thaiCopy.agent.title}
          </h1>
          <p className="text-xs text-text-secondary truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <ModeSwitcher variant="compact" className="shrink-0" />
        {onOpenHistory ? (
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center justify-center min-w-11 min-h-11 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors assistant-desktop:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
            aria-label="ประวัติแชท"
          >
            <History className="w-5 h-5" />
          </button>
        ) : null}
        {onNewChat ? (
          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center justify-center min-w-11 min-h-11 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
            aria-label={thaiCopy.agent.newChat}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        ) : null}
      </div>
    </header>
  );
}
