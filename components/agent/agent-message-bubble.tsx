"use client";

import { useState } from "react";
import { Copy, Check, Search } from "lucide-react";
import {
  isToolUIPart,
  type UIMessage,
} from "ai";
import { AgentThinkingLog } from "@/components/agent/agent-thinking-log";
import {
  ItemResultCard,
} from "@/components/agent/item-result-card";
import type { SerializedItem } from "@/lib/agent/item-privacy";
import { MatchResultCard } from "@/components/agent/match-result-card";
import { NerResultCard, type NerResultData } from "@/components/agent/ner-result-card";
import { joinAgentTextParts } from "@/lib/agent/text-completeness";

function extractTextFromMessage(message: UIMessage): string {
  return joinAgentTextParts(message.parts as Array<{ type: string; text?: string }>);
}

/** Hide raw tool JSON the model sometimes echoes before the Thai summary. */
function stripEchoedToolJson(text: string, hasArtifacts: boolean): string {
  if (!hasArtifacts || !text.trim()) return text;
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return text;

  const looksLikeToolEnvelope =
    trimmed.includes('"status"') ||
    (trimmed.includes('"ok"') && trimmed.includes('"resultType"'));
  if (!looksLikeToolEnvelope) return text;

  const closingBrace = trimmed.indexOf("}");
  if (closingBrace < 0 || closingBrace === trimmed.length - 1) {
    return "";
  }

  const remainder = trimmed.slice(closingBrace + 1).trim();
  return remainder || "";
}

function itemArtifactKey(item: SerializedItem): string {
  if (item.id) return `${item.type}-${item.id}`;
  return `${item.type}-${item.itemName ?? ""}-${item.location ?? ""}`;
}

function dedupeItems(items: SerializedItem[]): SerializedItem[] {
  const seen = new Set<string>();
  const unique: SerializedItem[] = [];
  for (const item of items) {
    const key = itemArtifactKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function extractToolArtifacts(message: UIMessage) {
  const items: SerializedItem[] = [];
  const newItems: SerializedItem[] = [];
  const matches: Array<{
    scorePercentage: number;
    confidence: string;
    lostItem: SerializedItem;
    foundItem: SerializedItem;
    reasons?: string[];
  }> = [];
  const nerResults: NerResultData[] = [];
  const toolErrors: string[] = [];

  for (const part of message.parts || []) {
    if (!isToolUIPart(part) || part.state !== "output-available") continue;
    const output = part.output as {
      ok?: boolean;
      resultType?: string;
      data?: unknown;
      message?: string;
    } | undefined;
    if (!output) continue;

    if (output.ok === false) {
      if (output.message) toolErrors.push(output.message);
      continue;
    }

    if (output.data == null) continue;

    if (output.resultType === "ner" && output.data) {
      nerResults.push(output.data as NerResultData);
    } else if (output.resultType === "report" && output.data) {
      const data = output.data as {
        item?: SerializedItem;
        matches?: typeof matches;
      };
      if (data.item) {
        newItems.push(data.item);
        items.push(data.item);
      }
      if (data.matches?.length) {
        matches.push(...data.matches);
      }
    } else if (output.resultType === "items") {
      const data = output.data as { lost?: SerializedItem[]; found?: SerializedItem[] };
      items.push(...(data.lost || []), ...(data.found || []));
    } else if (output.resultType === "tracking" && output.data) {
      items.push(output.data as SerializedItem);
    } else if (output.resultType === "match" && Array.isArray(output.data)) {
      matches.push(...(output.data as typeof matches));
    }
  }

  return {
    items: dedupeItems(items),
    newItems: dedupeItems(newItems),
    matches,
    nerResults,
    toolErrors,
  };
}

type AgentMessageBubbleProps = {
  message: UIMessage;
  isStreaming?: boolean;
  showThinkingLog?: boolean;
};

export function AgentMessageBubble({
  message,
  isStreaming,
  showThinkingLog = true,
}: AgentMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const rawText = extractTextFromMessage(message);
  const { items, newItems, matches, nerResults, toolErrors } = isUser
    ? { items: [], newItems: [], matches: [], nerResults: [], toolErrors: [] }
    : extractToolArtifacts(message);
  const hasArtifacts =
    items.length > 0 || matches.length > 0 || nerResults.length > 0;
  const text = isUser ? rawText : stripEchoedToolJson(rawText, hasArtifacts);

  const newItemIds = new Set(newItems.map((item) => item.id));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 min-w-0 max-w-full">
        <div className="max-w-[85%] md:max-w-[70%] min-w-0 px-4 py-2.5 rounded-2xl rounded-br-md bg-line-green-light text-text-primary text-base leading-relaxed break-words [overflow-wrap:anywhere]">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-6 group min-w-0 max-w-full">
      <div className="agent-avatar w-8 h-8 shrink-0 mt-0.5" aria-hidden>
        <Search className="w-4 h-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        {showThinkingLog ? (
          <AgentThinkingLog message={message} isStreaming={isStreaming} />
        ) : null}

        {toolErrors.map((err, i) => (
          <div
            key={`tool-err-${i}`}
            className="rounded-xl px-3 py-2 mb-3 text-xs text-status-error bg-status-error-light/80 border border-status-error/20 break-words"
          >
            {err}
          </div>
        ))}

        {nerResults.map((ner, i) => (
          <NerResultCard key={`ner-${i}`} data={ner} />
        ))}

        {items.length > 0 && (
          <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-2 mb-3 -mx-1 px-1 [scrollbar-gutter:stable]">
            <div className="flex gap-3 w-max max-w-none md:grid md:grid-cols-2 md:gap-3 md:w-full md:max-w-full">
              {items.map((item, index) => (
                <ItemResultCard
                  key={`${itemArtifactKey(item)}-${index}`}
                  item={item}
                  isNew={newItemIds.has(item.id || "")}
                />
              ))}
            </div>
          </div>
        )}

        {matches.map((match, i) => (
          <MatchResultCard key={i} match={match} className="mb-3" />
        ))}

        {text ? (
          <div className="relative min-w-0 max-w-full">
            <p className="text-base leading-relaxed text-text-primary whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {text}
              {isStreaming ? <span className="agent-stream-cursor" aria-hidden /> : null}
            </p>
            {!isStreaming && (
              <button
                type="button"
                onClick={handleCopy}
                className="absolute -top-1 right-0 inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg hover:bg-bg-tertiary text-text-tertiary transition-opacity opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 focus-visible:opacity-100 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
                aria-label="คัดลอก"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-line-green" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
