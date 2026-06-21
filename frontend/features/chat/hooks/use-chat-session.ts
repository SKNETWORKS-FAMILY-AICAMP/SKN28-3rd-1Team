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

  const setAudioEnabled = useCallback((enabled: boolean) => {
    audioEnabledRef.current = enabled
    setAudioEnabledState(enabled)

    if (!enabled) {
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

  const handleData = useCallback((dataPart: DataUIPart<ChatMessageData>) => {
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
  }, [loadAudioChunks])

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
