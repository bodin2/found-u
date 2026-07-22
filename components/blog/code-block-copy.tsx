"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CodeBlockCopyProps = {
  code: string;
  language: string;
  /** Pre-highlighted HTML from Shiki (includes both themes via CSS vars if dual) */
  highlightedHtml: string;
  className?: string;
};

export function CodeBlockCopy({
  code,
  language,
  highlightedHtml,
  className,
}: CodeBlockCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border-light bg-[#0d1117]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-xs font-medium text-white/50 truncate min-w-0">
          {language || "plaintext"}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white touch-manipulation shrink-0"
          aria-label="คัดลอกโค้ด"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              คัดลอกแล้ว
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              คัดลอก
            </>
          )}
        </button>
      </div>
      <div
        className="overflow-x-auto p-4 text-xs leading-[1.5] [&_pre]:m-0 [&_pre]:bg-transparent! [&_code]:font-mono"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </div>
  );
}
