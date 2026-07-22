"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { Send, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { thaiCopy } from "@/lib/copy/thai-student";

type AgentComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onVoiceClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export function AgentComposer({
  value,
  onChange,
  onSubmit,
  onVoiceClick,
  disabled,
  className,
}: AgentComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
    }
  };

  const busy = Boolean(disabled);

  return (
    <div className={cn("px-4 pb-4 pt-2 max-lg:safe-bottom assistant-desktop:px-5 assistant-desktop:pb-5 w-full max-w-full min-w-0", className)}>
      <div
        className={cn(
          "flex items-end gap-2 p-2 rounded-2xl bg-bg-card min-w-0",
          "border border-border-light",
          "focus-within:ring-2 focus-within:ring-line-green/25"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={thaiCopy.agent.placeholder}
          disabled={disabled}
          rows={1}
          aria-busy={busy}
          className="flex-1 min-w-0 resize-none bg-transparent px-3 py-2.5 text-base text-text-primary placeholder:text-text-tertiary outline-none max-h-[120px]"
        />
        {onVoiceClick ? (
          <button
            type="button"
            onClick={onVoiceClick}
            disabled={disabled}
            className="flex items-center justify-center min-w-11 min-h-11 rounded-full text-text-secondary hover:text-line-green hover:bg-line-green-light transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
            aria-label="โหมดเสียง"
          >
            <Mic className="w-5 h-5" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          aria-busy={busy}
          aria-label={busy ? "กำลังส่ง…" : "ส่งข้อความ"}
          className="flex items-center justify-center min-w-11 min-h-11 rounded-full bg-line-green-cta text-white hover:bg-line-green-cta-hover transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <Send className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
