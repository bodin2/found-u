"use client";

import { Search } from "lucide-react";
import { thaiCopy } from "@/lib/copy/thai-student";
import { cn } from "@/lib/utils";

type AgentEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
  className?: string;
};

export function AgentEmptyState({ onSelectPrompt, className }: AgentEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center text-center px-4 py-6 min-h-0 overflow-y-auto",
        className
      )}
    >
      <div className="w-full max-w-lg assistant-desktop:max-w-xl my-auto">
        <div
          className="agent-avatar w-16 h-16 assistant-desktop:w-[4.5rem] assistant-desktop:h-[4.5rem] mx-auto mb-5 assistant-desktop:mb-6"
          aria-hidden
        >
          <Search className="w-7 h-7 assistant-desktop:w-8 assistant-desktop:h-8" strokeWidth={2.25} />
        </div>

        <h2 className="mb-2 text-balance text-xl font-semibold leading-[1.3] text-text-primary">
          {thaiCopy.agent.welcome}
        </h2>
        <p className="mb-6 max-w-md mx-auto text-pretty text-base leading-[1.5] text-text-secondary assistant-desktop:mb-8">
          {thaiCopy.agent.welcomeHint}
        </p>

        <div className="flex flex-col gap-2 w-full">
          {thaiCopy.agent.suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="w-full min-h-11 text-left px-4 py-3 rounded-xl bg-bg-card border border-border-light hover:border-line-green/50 hover:bg-line-green-light/40 text-sm text-text-primary transition-colors touch-manipulation active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
