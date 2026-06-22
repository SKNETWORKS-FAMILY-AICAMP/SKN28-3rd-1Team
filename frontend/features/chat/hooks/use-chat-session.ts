"use client"

import { useChat } from "@ai-sdk/react"
import type { DataUIPart } from "ai"
import { useSearchParams } from "next/navigation"
import type { MutableRefObject } from "react"
import { useCallback, useEffect, useRef, useState } from "react"

import type { ChatMessageData, LegalChatMessage } from "@/features/chat/types"

type AudioPlaybackStatus = "idle" | "loading" | "ready" | "playing" | "paused"

export type AudioPlayerState = {
  status: AudioPlaybackStatus
  currentTime: number
  duration: number
  chunks: number
}

const EMPTY_AUDIO_PLAYER: AudioPlayerState = {
  status: "idle",
  currentTime: 0,
  duration: 0,
  chunks: 0,
}

function decodeBase64Bytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function audioDuration(audio: HTMLAudioElement, fallback: number) {
  return Number.isFinite(audio.duration) ? audio.duration : fallback
}

function stopAudioPlayback(audioRef: MutableRefObject<HTMLAudioElement | null>, audioUrlRef: MutableRefObject<string | null>) {
  audioRef.current?.pause()
  audioRef.current = null

  if (audioUrlRef.current) {
    URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
  }
}

function pauseAudioPlayback(audioRef: MutableRefObject<HTMLAudioElement | null>) {
  audioRef.current?.pause()
}

function parseAudioSseBlock(block: string) {
  let event = "message"
  const dataLines: string[] = []

  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim())
  }

  if (dataLines.length === 0) return null

  try {
    const data = JSON.parse(dataLines.join("\n"))
    if (!data || typeof data !== "object") return null
    return { event, data: data as Record<string, unknown> }
  } catch {
    return null
  }
}

export function useChatSession() {
  const searchParams = useSearchParams()
  const [input, setInput] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [location, setLocation] = useState("")
  const [audioEnabled, setAudioEnabledState] = useState(true)
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayerState>(EMPTY_AUDIO_PLAYER)
  const startedRef = useRef(false)
  const audioChunksRef = useRef<Uint8Array[]>([])
  const audioEnabledRef = useRef(audioEnabled)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentAudioUrlRef = useRef<string | null>(null)
  const audioAbortRef = useRef<AbortController | null>(null)

  const setAudioEnabled = useCallback((enabled: boolean) => {
    audioEnabledRef.current = enabled
    setAudioEnabledState(enabled)

    if (!enabled) {
      audioAbortRef.current?.abort()
      audioAbortRef.current = null
      audioChunksRef.current = []
      pauseAudioPlayback(currentAudioRef)
      setAudioPlayer((current) => {
        const audio = currentAudioRef.current
        if (!audio) return EMPTY_AUDIO_PLAYER

        return {
          ...current,
          status: audio.ended ? "ready" : "paused",
          currentTime: audio.currentTime,
          duration: audioDuration(audio, current.duration),
        }
      })
    }
  }, [])

  const loadAudioChunks = useCallback((audioChunks: Uint8Array[], chunks: number) => {
    if (audioChunks.length === 0) return

    stopAudioPlayback(currentAudioRef, currentAudioUrlRef)

    const blob = new Blob(audioChunks as BlobPart[], { type: "audio/mpeg" })
    const audioUrl = URL.createObjectURL(blob)
    const audio = new Audio(audioUrl)
    currentAudioRef.current = audio
    currentAudioUrlRef.current = audioUrl

    const syncTime = () => {
      if (currentAudioRef.current !== audio) return

      setAudioPlayer((current) => ({
        ...current,
        currentTime: audio.currentTime,
        duration: audioDuration(audio, current.duration),
      }))
    }

    const syncStatus = (status: AudioPlaybackStatus) => {
      if (currentAudioRef.current !== audio) return

      setAudioPlayer((current) => ({
        ...current,
        status,
        currentTime: audio.currentTime,
        duration: audioDuration(audio, current.duration),
      }))
    }

    audio.addEventListener("loadedmetadata", syncTime)
    audio.addEventListener("durationchange", syncTime)
    audio.addEventListener("timeupdate", syncTime)
    audio.addEventListener("play", () => syncStatus("playing"))
    audio.addEventListener("pause", () => {
      if (!audio.ended) syncStatus("paused")
    })
    audio.addEventListener("ended", () => syncStatus("ready"))
    audio.addEventListener("error", () => syncStatus("ready"))

    setAudioPlayer({
      status: "ready",
      currentTime: 0,
      duration: 0,
      chunks,
    })

    void audio.play().catch(() => syncStatus("ready"))
  }, [])

  const startAudioStream = useCallback(async (request: { sessionId?: string | null; text: string; turnId?: string | null }) => {
    if (!audioEnabledRef.current) return

    audioAbortRef.current?.abort()
    audioChunksRef.current = []
    stopAudioPlayback(currentAudioRef, currentAudioUrlRef)
    setAudioPlayer({
      status: "loading",
      currentTime: 0,
      duration: 0,
      chunks: 0,
    })

    const abortController = new AbortController()
    audioAbortRef.current = abortController

    try {
      const response = await fetch("/api/chat/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          session_id: request.sessionId,
          text: request.text,
          turn_id: request.turnId,
        }),
        signal: abortController.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`audio stream failed: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      const handleParsedBlock = (parsed: NonNullable<ReturnType<typeof parseAudioSseBlock>>) => {
        if (!audioEnabledRef.current) return

        if (parsed.event === "audio") {
          const audioBase64 = String(parsed.data.audio_base64 ?? "")
          if (audioBase64) audioChunksRef.current.push(decodeBase64Bytes(audioBase64))
          return
        }

        if (parsed.event === "audio_done") {
          const chunks = Number(parsed.data.chunks ?? 0)
          const audioChunks = audioChunksRef.current
          audioChunksRef.current = []

          if (audioChunks.length > 0) {
            loadAudioChunks(audioChunks, chunks)
          } else {
            setAudioPlayer(EMPTY_AUDIO_PLAYER)
          }
          return
        }

        if (parsed.event === "error") {
          audioChunksRef.current = []
          setAudioPlayer(EMPTY_AUDIO_PLAYER)
        }
      }

      const processBuffer = () => {
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() ?? ""

        for (const block of blocks) {
          const parsed = parseAudioSseBlock(block)
          if (parsed) handleParsedBlock(parsed)
        }
      }

      for (;;) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        processBuffer()
      }

      buffer += decoder.decode()
      const remainingBlock = buffer.trim()
      if (remainingBlock) {
        const parsed = parseAudioSseBlock(remainingBlock)
        if (parsed) handleParsedBlock(parsed)
      }
    } catch {
      if (!abortController.signal.aborted) {
        audioChunksRef.current = []
        setAudioPlayer(EMPTY_AUDIO_PLAYER)
      }
    } finally {
      if (audioAbortRef.current === abortController) {
        audioAbortRef.current = null
      }
    }
  }, [loadAudioChunks])

  const handleData = useCallback((dataPart: DataUIPart<ChatMessageData>) => {
    if (dataPart.type === "data-audioRequest") {
      if (audioEnabledRef.current) {
        void startAudioStream(dataPart.data)
      }
      return
    }

    if (dataPart.type === "data-audio") {
      if (audioEnabledRef.current) {
        setAudioPlayer((current) =>
          current.status === "loading"
            ? current
            : {
                status: "loading",
                currentTime: 0,
                duration: 0,
                chunks: 0,
              },
        )
        audioChunksRef.current.push(decodeBase64Bytes(dataPart.data.audioBase64))
      }
      return
    }

    if (dataPart.type === "data-audioDone") {
      if (audioEnabledRef.current) {
        loadAudioChunks(audioChunksRef.current, dataPart.data.chunks)
      }
      audioChunksRef.current = []
    }
  }, [loadAudioChunks, startAudioStream])

  const { messages, sendMessage, status, error, clearError } = useChat<LegalChatMessage>({ onData: handleData })
  const isBusy = status === "submitted" || status === "streaming"

  const playAudio = useCallback(() => {
    const audio = currentAudioRef.current
    if (!audio) return
    if (audio.ended) audio.currentTime = 0

    void audio.play().catch(() => {
      setAudioPlayer((current) => ({ ...current, status: "ready" }))
    })
  }, [])

  const pauseAudio = useCallback(() => {
    currentAudioRef.current?.pause()
  }, [])

  const replayAudio = useCallback(() => {
    const audio = currentAudioRef.current
    if (!audio) return

    audio.currentTime = 0
    setAudioPlayer((current) => ({ ...current, currentTime: 0 }))
    void audio.play().catch(() => {
      setAudioPlayer((current) => ({ ...current, status: "ready" }))
    })
  }, [])

  const seekAudio = useCallback((time: number) => {
    const audio = currentAudioRef.current
    if (!audio) return

    const nextTime = Math.max(0, Math.min(time, audioDuration(audio, time)))
    audio.currentTime = nextTime
    setAudioPlayer((current) => ({ ...current, currentTime: nextTime }))
  }, [])

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || isBusy) return

      clearError()
      setInput("")
      void sendMessage({ text }, { body: { audio_enabled: audioEnabledRef.current } })
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

  useEffect(() => {
    audioEnabledRef.current = audioEnabled
  }, [audioEnabled])

  useEffect(() => {
    return () => {
      audioAbortRef.current?.abort()
      stopAudioPlayback(currentAudioRef, currentAudioUrlRef)
    }
  }, [])

  return {
    messages,
    input,
    setInput,
    birthYear,
    setBirthYear,
    location,
    setLocation,
    audioEnabled,
    setAudioEnabled,
    audioPlayer,
    playAudio,
    pauseAudio,
    replayAudio,
    seekAudio,
    send,
    status,
    error,
    isBusy,
    empty: messages.length === 0,
  }
}
