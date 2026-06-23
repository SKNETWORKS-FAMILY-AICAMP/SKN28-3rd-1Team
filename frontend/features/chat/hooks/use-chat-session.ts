"use client"

import { useChat } from "@ai-sdk/react"
import type { DataUIPart } from "ai"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import type { ChatMessageData, LegalChatMessage } from "@/features/chat/types"

const CONVERSATION_ID_QUERY_PARAM = "conversation_id"

function createConversationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `conversation-${crypto.randomUUID()}`
  }

  return `conversation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function decodeBase64Bytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function playAudioChunks(audioChunks: Uint8Array[]) {
  if (audioChunks.length === 0) return

  const blob = new Blob(audioChunks as BlobPart[], { type: "audio/mpeg" })
  void new Audio(URL.createObjectURL(blob)).play().catch(() => {})
}

export function useChatSession() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversationId, setConversationId] = useState(() => {
    const queryConversationId = searchParams.get(CONVERSATION_ID_QUERY_PARAM)?.trim()
    return queryConversationId || createConversationId()
  })
  const [input, setInput] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [location, setLocation] = useState("")
  const startedRef = useRef(false)
  const audioChunksRef = useRef<Uint8Array[]>([])

  const handleData = useCallback((dataPart: DataUIPart<ChatMessageData>) => {
    if (dataPart.type === "data-audio") {
      audioChunksRef.current.push(decodeBase64Bytes(dataPart.data.audioBase64))
      return
    }

    if (dataPart.type === "data-audioDone") {
      playAudioChunks(audioChunksRef.current)
      audioChunksRef.current = []
    }
  }, [])

  const { messages, setMessages, sendMessage, status, error, clearError } = useChat<LegalChatMessage>({
    id: conversationId,
    onData: handleData,
  })
  const isBusy = status === "submitted" || status === "streaming"

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || isBusy) return

      clearError()
      setInput("")
      const profile = {
        birthYear: birthYear.trim(),
        location: location.trim(),
      }
      const body =
        profile.birthYear || profile.location
          ? {
              profile,
            }
          : undefined

      void sendMessage({ text }, body ? { body } : undefined)
    },
    [birthYear, clearError, isBusy, location, sendMessage],
  )

  const reset = useCallback(() => {
    clearError()
    audioChunksRef.current = []
    setMessages([])
    setInput("")
    setBirthYear("")
    setLocation("")
    setConversationId(createConversationId())
    startedRef.current = true
  }, [clearError, setMessages])

  useEffect(() => {
    const queryConversationId = searchParams.get(CONVERSATION_ID_QUERY_PARAM)?.trim()
    if (queryConversationId === conversationId) return

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set(CONVERSATION_ID_QUERY_PARAM, conversationId)
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false })
  }, [conversationId, pathname, router, searchParams])

  useEffect(() => {
    if (startedRef.current) return

    const question = searchParams.get("q")
    if (!question) return

    const timeoutId = window.setTimeout(() => {
      if (startedRef.current) return
      startedRef.current = true
      send(question)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [searchParams, send])

  return {
    messages,
    input,
    setInput,
    birthYear,
    setBirthYear,
    location,
    setLocation,
    send,
    status,
    error,
    isBusy,
    empty: messages.length === 0,
    reset,
  }
}
