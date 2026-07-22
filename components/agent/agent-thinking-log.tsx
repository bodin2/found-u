"use client";

import { useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
} from "lucide-react";
import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { m, AnimatePresence } from "framer-motion";
import { thaiCopy } from "@/lib/copy/thai-student";
import { cn } from "@/lib/utils";

type StepStatus = "pending" | "running" | "done" | "error";

function getStepStatus(part: {
  state?: string;
  output?: unknown;
}): StepStatus {
  const state = part.state;
  if (state === "output-error") return "error";
  if (state === "output-available") {
    const output = part.output as { ok?: boolean } | undefined;
    if (output && output.ok === false) return "error";
    return "done";
  }
  if (state === "input-available" || state === "input-streaming") return "running";
  return "pending";
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "running")
    return (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-line-green motion-reduce:animate-none" />
    );
  if (status === "done") return <CheckCircle2 className="w-3.5 h-3.5 text-line-green" />;
  if (status === "error") return <XCircle className="w-3.5 h-3.5 text-status-error" />;
  return <Circle className="w-3.5 h-3.5 text-text-tertiary" />;
}

type AgentThinkingLogProps = {
  message: UIMessage;
  isStreaming?: boolean;
  className?: string;
};

export function AgentThinkingLog({
  message,
  isStreaming = false,
  className,
}: AgentThinkingLogProps) {
  const toolParts = (message.parts || []).filter(isToolUIPart);
  const [userExpanded, setUserExpanded] = useState(false);
  const expanded = isStreaming || userExpanded;

  if (toolParts.length === 0) return null;

  const allDone = toolParts.every((p) => getStepStatus(p) === "done" || getStepStatus(p) === "error");

  return (
    <div className={cn("mb-3", className)}>
      <button
        type="button"
        onClick={() => {
          if (!isStreaming) setUserExpanded((value) => !value);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl agent-thinking-panel text-left"
      >
        <span className="text-xs font-medium text-text-secondary">
          {isStreaming && !allDone ? thaiCopy.agent.thinking : "ขั้นตอนการทำงาน"}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-text-tertiary transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="mt-2 space-y-2 pl-1">
              {toolParts.map((part, i) => {
                const toolName = getToolName(part);
                const label =
                  thaiCopy.agent.toolLabels[toolName] || toolName;
                const status = getStepStatus(part);
                return (
                  <li key={`${toolName}-${i}`} className="flex items-center gap-2 text-xs">
                    <StatusIcon status={status} />
                    <span className="text-text-secondary">{label}</span>
                  </li>
                );
              })}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
