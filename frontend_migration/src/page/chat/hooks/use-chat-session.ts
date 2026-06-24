"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LegalChatMessage } from "@/bff/chat/contract";
import { useTtsStreamingPlayback } from "@/page/chat/hooks/use-tts-streaming-playback";
import { frontendSettings } from "@/settings/frontend";

const CONVERSATION_ID_QUERY_PARAM = "conversation_id";

function createConversationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `conversation-${crypto.randomUUID()}`;
  }

  return `conversation-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function useChatSession() {
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
      }),
    []
  );

  const { messages, setMessages, sendMessage, status, error, clearError } =
    useChat<LegalChatMessage>({
      id: conversationId,
      onData: handleTtsData,
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

      void sendMessage({ text });
    },
    [clearError, disposeTtsPlayer, isBusy, sendMessage]
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
