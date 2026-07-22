"use client";

import { useState } from "react";
import { History, Pin, PinOff, Search, Trash2, X } from "lucide-react";
import { useChatContext } from "@/contexts/chat-context";
import { ChatSessionMenu } from "@/components/agent/chat-session-menu";
import { cn } from "@/lib/utils";

function formatSessionTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

type ChatSidebarProps = {
  className?: string;
  variant?: "drawer" | "inline";
};

export function ChatSidebar({ className, variant = "drawer" }: ChatSidebarProps) {
  const {
    sessions,
    activeSessionId,
    sidebarOpen,
    setSidebarOpen,
    switchSession,
    deleteSession,
    renameSession,
    pinSession,
    clearAgentMemory,
  } = useChatContext();
  const [query, setQuery] = useState("");

  const filtered = sessions.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.preview.toLowerCase().includes(q)
    );
  });

  const content = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border-light/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-4 h-4 text-text-tertiary shrink-0" />
          <h2 className="truncate text-balance text-base font-semibold leading-[1.4] text-text-primary">
            ประวัติแชท
          </h2>
        </div>
        {variant === "drawer" ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg hover:bg-bg-tertiary text-text-secondary touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาแชท..."
            className="w-full min-h-11 pl-9 pr-3 py-2.5 text-base rounded-xl bg-bg-tertiary border border-border-light/60 focus:outline-none focus:ring-2 focus:ring-line-green/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-pretty text-base leading-[1.5] text-text-secondary">
            ยังไม่มีประวัติแชท
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <li key={session.id}>
                  <div
                    className={cn(
                      "group flex items-start gap-1 rounded-xl transition-colors",
                      isActive ? "bg-line-green/10" : "hover:bg-bg-tertiary"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void switchSession(session.id)}
                      className="flex-1 text-left px-3 py-3 min-h-11 min-w-0 touch-manipulation"
                    >
                      <div className="flex items-center gap-1.5">
                        {session.pinned ? (
                          <Pin className="w-3.5 h-3.5 text-line-green shrink-0" aria-hidden />
                        ) : null}
                        <span className="text-sm font-medium text-text-primary truncate">
                          {session.title}
                        </span>
                      </div>
                      {session.preview ? (
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {session.preview}
                        </p>
                      ) : null}
                      <p className="text-xs text-text-secondary mt-1">
                        {formatSessionTime(session.updatedAt)}
                        {session.messageCount > 0 ? ` · ${session.messageCount} ข้อความ` : ""}
                      </p>
                    </button>
                    <div className="flex items-center gap-0.5 pr-1 pt-0.5 shrink-0 opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 focus-within:!opacity-100">
                      <button
                        type="button"
                        onClick={() => void pinSession(session.id, !session.pinned)}
                        className="inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg hover:bg-bg-secondary text-text-tertiary touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
                        aria-label={session.pinned ? "เลิกปักหมุด" : "ปักหมุด"}
                      >
                        {session.pinned ? (
                          <PinOff className="w-4 h-4" aria-hidden />
                        ) : (
                          <Pin className="w-4 h-4" aria-hidden />
                        )}
                      </button>
                      <ChatSessionMenu
                        sessionId={session.id}
                        title={session.title}
                        onRename={renameSession}
                        onDelete={deleteSession}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="px-3 py-3 border-t border-border-light/60 shrink-0">
        <button
          type="button"
          onClick={() => void clearAgentMemory()}
          className="w-full min-h-11 flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-status-error py-2.5 rounded-xl hover:bg-status-error-light/50 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-error/30"
        >
          <Trash2 className="w-4 h-4" aria-hidden />
          ลบความจำ Agent
        </button>
      </div>
    </div>
  );

  if (variant === "inline") {
    return (
      <aside
        className={cn(
          "hidden assistant-desktop:flex w-[260px] shrink-0 flex-col min-h-0 h-full",
          "border-r border-border-light bg-bg-primary",
          className
        )}
      >
        {content}
      </aside>
    );
  }

  if (!sidebarOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 assistant-desktop:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,280px)] bg-bg-primary border-r border-border-light",
          "flex flex-col assistant-desktop:hidden animate-in slide-in-from-left duration-200 motion-reduce:animate-none"
        )}
      >
        {content}
      </aside>
    </>
  );
}
