"use client";

import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useRef } from "react";

import type { LegalChatMessage } from "@/bff/chat/contract";
import type { DictationStatus } from "@/page/chat/hooks/use-browser-speech-dictation";
import {
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/outline";
import { MessageResponse } from "@/ui/ai-elements/message";
import { cn } from "@/lib/utils";
import { ChatComposer } from "@/ui/components/chat/chat-composer";
import { MascotAvatar } from "@/ui/components/mascot/mascot-avatar";
import {
  formatTimestamp,
  getDataParts,
  getMessageText,
} from "@/page/chat/message-utils";

type ChatSidebarProps = {
  messages: LegalChatMessage[];
  messageTimestamps: Map<string, string>;
  status: "submitted" | "streaming" | "ready" | "error";
  input: string;
  isBusy: boolean;
  error?: Error;
  width?: number;
  traceExpanded: boolean;
  traceItemCount: number;
  ttsEnabled: boolean;
  dictationShortcut: {
    ariaKeyShortcuts: string;
    label: string;
  };
  dictationStatus: DictationStatus;
  dictationError?: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onToggleTtsPlayback: () => void;
  onVoiceClick: () => void;
  onToggleTrace: () => void;
  onResizePointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

export function ChatSidebar({
  messages,
  messageTimestamps,
  status,
  input,
  isBusy,
  error,
  width,
  traceExpanded,
  traceItemCount,
  ttsEnabled,
  dictationShortcut,
  dictationStatus,
  dictationError,
  onInputChange,
  onSubmit,
  onToggleTtsPlayback,
  onVoiceClick,
  onToggleTrace,
  onResizePointerDown,
}: ChatSidebarProps) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const showPendingAssistant =
    status === "submitted" && messages.at(-1)?.role === "user";

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, isBusy]);

  return (
    <div
      className="chat-sidebar-shell relative flex shrink-0 flex-col"
      style={
        {
          "--chat-sidebar-width": width ? `${width}px` : undefined,
        } as CSSProperties
      }
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--chat-border)] px-4">
        <span className="text-xs font-extrabold uppercase tracking-normal text-[var(--chat-text-muted)]">
          상담
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleTtsPlayback}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-[9px] border px-2.5 text-xs font-bold transition",
              ttsEnabled
                ? "border-[var(--chat-primary)] bg-[var(--chat-primary)] text-white"
                : "border-[var(--chat-border-strong)] bg-[var(--chat-panel)] text-[var(--chat-text-muted)] hover:border-[var(--chat-primary-border)]"
            )}
            aria-pressed={ttsEnabled}
            aria-label={ttsEnabled ? "음성 답변 재생 끄기" : "음성 답변 재생 켜기"}
            title={ttsEnabled ? "음성 답변 재생 끄기" : "음성 답변 재생 켜기"}
          >
            {ttsEnabled ? (
              <SpeakerWaveIcon className="size-3.5" />
            ) : (
              <SpeakerXMarkIcon className="size-3.5" />
            )}
            {ttsEnabled ? "음성 On" : "음성 Off"}
          </button>
          <button
            type="button"
            onClick={onToggleTrace}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-[9px] border px-2.5 text-xs font-bold transition",
              traceExpanded
                ? "border-[var(--chat-primary)] bg-[var(--chat-primary)] text-white"
                : "border-[var(--chat-border-strong)] bg-[var(--chat-panel)] text-[var(--chat-text-muted)] hover:border-[var(--chat-primary-border)]"
            )}
            aria-expanded={traceExpanded}
            aria-label={traceExpanded ? "에이전트 trace 닫기" : "에이전트 trace 열기"}
          >
            Trace
            {traceItemCount > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  traceExpanded
                    ? "bg-white/20 text-white"
                    : "bg-[var(--chat-sidebar-muted)] text-[var(--chat-text-muted)]"
                )}
              >
                {traceItemCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div
        ref={messagesRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-4 [scrollbar-color:var(--chat-border-strong)_transparent] [scrollbar-width:thin]"
      >
        {messages.length === 0 ? <SidebarGreeting /> : null}
        {messages.map((message) => (
          <SidebarChatMessage
            key={message.id}
            isLive={status === "streaming" && message.id === messages.at(-1)?.id}
            message={message}
            timestamp={messageTimestamps.get(message.id)}
          />
        ))}
        {showPendingAssistant ? <SidebarPendingMessage /> : null}
      </div>

      <ChatComposer
        input={input}
        isBusy={isBusy}
        error={error}
        dictationShortcut={dictationShortcut}
        dictationStatus={dictationStatus}
        dictationError={dictationError}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onVoiceClick={onVoiceClick}
      />

      <button
        type="button"
        aria-label="상담 사이드바 너비 조절"
        className="chat-sidebar-resizer absolute right-0 top-0 z-10 h-full w-2 translate-x-1/2 cursor-col-resize rounded-full transition focus-visible:outline-none"
        onPointerDown={onResizePointerDown}
      />
    </div>
  );
}

function SidebarAvatar({ isUser = false }: { isUser?: boolean }) {
  if (isUser) {
    return (
      <div className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--chat-sidebar-muted)] text-xs font-bold text-[var(--chat-text-muted)]">
        나
      </div>
    );
  }

  return <MascotAvatar className="size-[30px]" imageSize={30} alt="" />;
}

function SidebarGreeting() {
  return (
    <div className="flex items-start gap-2">
      <SidebarAvatar />
      <div className="chat-sidebar-message-bubble max-w-[calc(var(--chat-sidebar-width)-112px)] rounded-[4px_14px_14px_14px] border border-[var(--chat-border)] bg-[var(--chat-panel)] px-3.5 py-3 text-sm leading-relaxed text-[var(--chat-text)]">
        안녕하세요, 로디에요!
        <br />
        궁금한 점을 편하게 물어보세요.
      </div>
    </div>
  );
}

function SidebarPendingMessage() {
  return (
    <div className="flex items-start gap-2">
      <SidebarAvatar />
      <div className="flex gap-1 rounded-[4px_14px_14px_14px] border border-[var(--chat-border)] bg-[var(--chat-panel)] px-4 py-3.5">
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--chat-primary)]" />
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--chat-primary)] [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--chat-primary)] [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function MessageTimestamp({
  className,
  timestamp,
}: {
  className?: string;
  timestamp?: string;
}) {
  const label = formatTimestamp(timestamp);
  if (!label) return null;

  return (
    <div className={cn("mt-1.5 text-right text-[10px] font-medium leading-none", className)}>
      {label}
    </div>
  );
}

function SidebarChatMessage({
  isLive = false,
  message,
  timestamp,
}: {
  isLive?: boolean;
  message: LegalChatMessage;
  timestamp?: string;
}) {
  const isUser = message.role === "user";
  const textParts = message.parts.filter((part) => part.type === "text");

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2">
        <div className="min-w-0">
          <div className="chat-sidebar-message-bubble max-w-[calc(var(--chat-sidebar-width)-112px)] whitespace-pre-wrap rounded-[14px_4px_14px_14px] bg-[var(--chat-user-bubble)] px-3.5 py-3 text-left text-sm leading-relaxed text-[var(--chat-text)]">
            {getMessageText(message)}
            <MessageTimestamp
              timestamp={timestamp}
              className="text-[var(--chat-text-muted)]"
            />
          </div>
        </div>
        <SidebarAvatar isUser />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <SidebarAvatar />
      <div className="min-w-0 space-y-2">
        {textParts.length > 0 ? (
          <div className="chat-sidebar-message-bubble max-w-[calc(var(--chat-sidebar-width)-112px)] rounded-[4px_14px_14px_14px] border border-[var(--chat-border)] bg-[var(--chat-assistant-bubble)] px-3.5 py-3 text-sm leading-relaxed text-[var(--chat-text)]">
            {textParts.map((part, index) => (
              <MessageResponse
                key={`${message.id}-text-${index}`}
                className="break-words leading-relaxed"
              >
                {part.text}
              </MessageResponse>
            ))}
            <MainAgentToolIndicator isLive={isLive} message={message} />
            <MessageTimestamp
              timestamp={timestamp}
              className="text-[var(--chat-text-muted)]"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MainAgentToolIndicator({
  isLive,
  message,
}: {
  isLive: boolean;
  message: LegalChatMessage;
}) {
  const toolSummary = getMainAgentToolSummary(message);

  if (toolSummary.count > 0) {
    return (
      <div
        className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-[8px] bg-[var(--chat-success-bg)] px-2 py-1 text-[11px] font-bold text-[var(--chat-success-text)]"
        title={toolSummary.names.length ? toolSummary.names.join(", ") : undefined}
      >
        <span className="size-1.5 rounded-full bg-[var(--chat-success-text)]" />
        메인 도구 호출 {toolSummary.count}회
      </div>
    );
  }

  if (isLive) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--chat-sidebar-muted)] px-2 py-1 text-[11px] font-bold text-[var(--chat-text-muted)]">
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--chat-text-soft)]" />
        메인 도구 확인 중
      </div>
    );
  }

  return (
    <div className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--chat-warning-bg)] px-2 py-1 text-[11px] font-bold text-[var(--chat-warning-text)]">
      <span className="size-1.5 rounded-full bg-[var(--chat-warning-text)]" />
      메인 도구 호출 없음
    </div>
  );
}

function getMainAgentToolSummary(message: LegalChatMessage) {
  const toolCalls = getDataParts(message, "toolCall")
    .map((part) => part.data)
    .filter((toolCall) => normalizeAgentName(toolCall.sourceAgent) === "main_agent");
  const toolKeys = new Set<string>();
  const names = new Set<string>();

  for (const toolCall of toolCalls) {
    const name = toolCall.name?.trim() || "unknown tool";
    const key = toolCall.id?.trim() || name;

    toolKeys.add(key);
    names.add(name);
  }

  return {
    count: toolKeys.size,
    names: [...names],
  };
}

function normalizeAgentName(value?: string | null) {
  return (value || "main_agent").trim().toLowerCase().replaceAll("-", "_");
}
