"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { ChatProvider, useAutoTitle, useChatContext } from "@/contexts/chat-context";
import { AgentTopBar } from "@/components/agent/agent-top-bar";
import { AgentEmptyState } from "@/components/agent/agent-empty-state";
import { AgentMessageList } from "@/components/agent/agent-message-list";
import { AgentComposer } from "@/components/agent/agent-composer";
import { ClassicQuickLinks } from "@/components/agent/classic-quick-links";
import { TraditionalFallbackPanel } from "@/components/agent/traditional-fallback-panel";
import { VoiceSphereOverlay } from "@/components/agent/voice-sphere-overlay";
import { ChatSidebar } from "@/components/agent/chat-sidebar";
import { thaiCopy } from "@/lib/copy/thai-student";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { AUTH_ROUTES } from "@/lib/auth-routes";

function AgentChatInner() {
  const { user, loading: authLoading } = useAuth();
  const mounted = useMounted();
  const [input, setInput] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);

  const {
    messages,
    status,
    fallback,
    droppedCount,
    storageWarning,
    setSidebarOpen,
    createSession,
    sendPrompt,
    handleSubmit,
    clearFallback,
    isThinking,
    loading: chatLoading,
    activeSessionId,
  } = useChatContext();

  useAutoTitle(messages, activeSessionId);

  if ((authLoading && !user) || !mounted) {
    return (
      <div
        className="h-full flex-1 flex items-center justify-center agent-surface-bg min-h-0"
        role="status"
        aria-label="กำลังโหลด"
      >
        <div className="w-8 h-8 rounded-full border-2 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex-1 flex flex-col agent-surface-bg min-h-0">
        <AgentTopBar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-text-secondary mb-5 max-w-sm leading-relaxed">
            {thaiCopy.agent.loginRequired}
          </p>
          <Link
            href={AUTH_ROUTES.hub}
            className="px-8 py-3 rounded-full bg-line-green text-white font-medium hover:bg-line-green-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2"
          >
            เข้าสู่ระบบ
          </Link>
          <ClassicQuickLinks className="mt-8" />
        </div>
      </div>
    );
  }

  if (chatLoading) {
    return (
      <div
        className="h-full flex-1 flex items-center justify-center agent-surface-bg min-h-0"
        role="status"
        aria-label="กำลังโหลดแชท"
      >
        <div className="w-8 h-8 rounded-full border-2 border-line-green border-t-transparent animate-spin" />
      </div>
    );
  }

  const onSubmit = () => {
    handleSubmit(input);
    setInput("");
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 w-full min-w-0",
        "assistant-desktop:rounded-2xl assistant-desktop:border assistant-desktop:border-border-light",
        "assistant-desktop:overflow-hidden assistant-desktop:bg-bg-primary assistant-desktop:shadow-card"
      )}
    >
      <ChatSidebar variant="inline" />
      <ChatSidebar variant="drawer" />

      <div className="flex flex-col min-h-0 flex-1 agent-surface-bg agent-chat-pane assistant-desktop:bg-bg-primary">
        <AgentTopBar
          status={status}
          onNewChat={() => void createSession()}
          onOpenHistory={() => setSidebarOpen(true)}
        />

        {droppedCount > 0 ? (
          <div
            className="mx-4 mt-2 feedback-panel feedback-panel--info text-xs text-text-secondary shrink-0"
            role="status"
          >
            แชทยาว — จำเฉพาะข้อความล่าสุด ({droppedCount} ข้อความเก่าไม่ส่งให้ผู้ช่วย)
          </div>
        ) : null}

        {storageWarning ? (
          <div
            className="mx-4 mt-2 feedback-panel feedback-panel--warning text-xs text-text-primary shrink-0"
            role="status"
          >
            {storageWarning}
          </div>
        ) : null}

        {messages.length === 0 && !fallback ? (
          <AgentEmptyState
            className="flex-1 min-h-0"
            onSelectPrompt={sendPrompt}
          />
        ) : (
          <AgentMessageList messages={messages} status={status} />
        )}

        {fallback ? (
          <TraditionalFallbackPanel payload={fallback} className="mx-4 mb-2" />
        ) : null}

        {messages.length > 0 ? (
          <ClassicQuickLinks
            className="px-4 pb-2 shrink-0"
            onAgentPrompt={sendPrompt}
          />
        ) : null}

        <AgentComposer
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          onVoiceClick={() => !isThinking && setVoiceOpen(true)}
          disabled={isThinking}
          className="shrink-0"
        />

        <VoiceSphereOverlay
          open={voiceOpen && !isThinking}
          onClose={() => setVoiceOpen(false)}
          onTranscript={(text) => {
            clearFallback();
            setVoiceOpen(false);
            sendPrompt(text);
          }}
        />
      </div>
    </div>
  );
}

export function AgentChatShell() {
  return (
    <ChatProvider>
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <AgentChatInner />
      </div>
    </ChatProvider>
  );
}
