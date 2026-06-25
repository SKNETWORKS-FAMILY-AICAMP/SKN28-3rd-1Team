"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type DataUIPart } from "ai";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessageData, LegalChatMessage } from "@/bff/chat/contract";
import { useTtsStreamingPlayback } from "@/page/chat/hooks/use-tts-streaming-playback";
import { frontendSettings } from "@/settings/frontend";
import type { ChatWorkspaceSnapshot } from "@/ui/components/chat/workspace_root/workspace-state";

const CONVERSATION_ID_QUERY_PARAM = "conversation_id";

function createConversationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `conversation-${crypto.randomUUID()}`;
  }

  return `conversation-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

type UseChatSessionOptions = {
  getApplicationState?: () => ChatWorkspaceSnapshot | undefined;
  onWorkspaceCommand?: (command: ChatMessageData["workspaceCommand"]) => void;
};

export function useChatSession({
  getApplicationState,
  onWorkspaceCommand,
}: UseChatSessionOptions = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversationId, setConversationId] = useState(() => {
    const queryConversationId = searchParams
      .get(CONVERSATION_ID_QUERY_PARAM)
      ?.trim();
    return queryConversationId || createConversationId();
  });
  const [input, setInput] = useState("");
  const startedRef = useRef(false);
  const { disposeTtsPlayer, handleTtsData, ttsPlaybackStatus } =
    useTtsStreamingPlayback();
  const transport = useMemo(
    () =>
      new DefaultChatTransport<LegalChatMessage>({
        api: frontendSettings.chatApiPath,
        prepareSendMessagesRequest: ({ body, id, messages }) => {
          const requestBody =
            body && typeof body === "object" && !Array.isArray(body)
              ? body
              : {};

          return {
            body: {
              id,
              ...requestBody,
              messages,
            },
          };
        },
      }),
    []
  );
  const handleData = useCallback(
    (dataPart: DataUIPart<ChatMessageData>) => {
      handleTtsData(dataPart);

      if (dataPart.type === "data-workspaceCommand") {
        onWorkspaceCommand?.(dataPart.data);
      }
    },
    [handleTtsData, onWorkspaceCommand]
  );

  const { messages, setMessages, sendMessage, status, error, clearError } =
    useChat<LegalChatMessage>({
      id: conversationId,
      onData: handleData,
      transport,
    });
  const isBusy = status === "submitted" || status === "streaming";

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || isBusy) return;

      clearError();
      disposeTtsPlayer("new message");
      setInput("");

      const applicationState = getApplicationState?.();
      void sendMessage(
        { text },
        applicationState ? { body: { applicationState } } : undefined
      );
    },
    [clearError, disposeTtsPlayer, getApplicationState, isBusy, sendMessage]
  );

  const reset = useCallback(() => {
    clearError();
    disposeTtsPlayer("reset");
    setMessages([]);
    setInput("");
    setConversationId(createConversationId());
    startedRef.current = true;
  }, [clearError, disposeTtsPlayer, setMessages]);

  useEffect(() => {
    if (!error && status !== "error") return;
    disposeTtsPlayer(error?.message ?? "chat error");
  }, [disposeTtsPlayer, error, status]);

  useEffect(() => {
    const queryConversationId = searchParams
      .get(CONVERSATION_ID_QUERY_PARAM)
      ?.trim();
    if (queryConversationId === conversationId) return;

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set(CONVERSATION_ID_QUERY_PARAM, conversationId);
    router.replace(`${pathname}?${nextSearchParams.toString()}`, {
      scroll: false,
    });
  }, [conversationId, pathname, router, searchParams]);

  useEffect(() => {
    if (startedRef.current) return;

    const question = searchParams.get("q");
    if (!question) return;

    const timeoutId = window.setTimeout(() => {
      if (startedRef.current) return;
      startedRef.current = true;
      send(question);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [searchParams, send]);

  return {
    messages,
    input,
    setInput,
    send,
    status,
    error,
    isBusy,
    ttsPlaybackStatus,
    empty: messages.length === 0,
    reset,
  };
}
