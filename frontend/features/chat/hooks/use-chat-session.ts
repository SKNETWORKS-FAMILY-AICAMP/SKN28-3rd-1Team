"use client"

import { useChat } from "@ai-sdk/react"
import type { DataUIPart } from "ai"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import type { ChatMessageData, LegalChatMessage } from "@/features/chat/types"

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
  const searchParams = useSearchParams()
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

  const { messages, sendMessage, status, error, clearError } = useChat<LegalChatMessage>({ onData: handleData })
  const isBusy = status === "submitted" || status === "streaming"

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || isBusy) return

      clearError()
      setInput("")
      void sendMessage({ text })
    },
    [clearError, isBusy, sendMessage],
  )

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
  }
}
