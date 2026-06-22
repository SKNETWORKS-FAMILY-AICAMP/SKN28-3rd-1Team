"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { DictationStatus, DictationTranscript } from "@/components/voice/types"

type SpeechRecognitionAlternativeLike = {
  transcript?: string
}

type SpeechRecognitionResultLike = {
  isFinal?: boolean
  0?: SpeechRecognitionAlternativeLike
}

type SpeechRecognitionResultListLike = {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

type SpeechRecognitionEventLike = {
  results: SpeechRecognitionResultListLike
}

type SpeechRecognitionErrorEventLike = {
  error?: string
}

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onstart: (() => void) | null
  abort: () => void
  start: () => void
  stop: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type BrowserSpeechRecognitionWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
}

type UseBrowserSpeechDictationOptions = {
  onTranscriptChange?: (transcript: DictationTranscript) => void
}

export function useBrowserSpeechDictation({ onTranscriptChange }: UseBrowserSpeechDictationOptions = {}) {
  const [status, setStatus] = useState<DictationStatus>("idle")
  const [transcript, setTranscript] = useState<DictationTranscript>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const statusRef = useRef<DictationStatus>("idle")
  const startedAtRef = useRef<number | null>(null)
  const transcriptTextRef = useRef("")
  const onTranscriptChangeRef = useRef(onTranscriptChange)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange
  }, [onTranscriptChange])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    const nextStatus = statusRef.current === "unsupported" ? "unsupported" : "idle"

    recognitionRef.current?.abort()
    recognitionRef.current = null
    startedAtRef.current = null
    transcriptTextRef.current = ""
    statusRef.current = nextStatus
    setStatus(nextStatus)
    setTranscript(undefined)
    setErrorMessage(undefined)
  }, [])

  const start = useCallback(() => {
    const Recognition = getBrowserSpeechRecognition()

    if (!Recognition) {
      const message = "이 브라우저에서는 음성 입력을 사용할 수 없어요."

      statusRef.current = "unsupported"
      setStatus("unsupported")
      setErrorMessage(message)
      return
    }

    recognitionRef.current?.abort()
    transcriptTextRef.current = ""
    setTranscript(undefined)
    setErrorMessage(undefined)
    setStatus("requesting-permission")
    statusRef.current = "requesting-permission"

    const recognition = new Recognition()
    recognitionRef.current = recognition
    startedAtRef.current = Date.now()

    recognition.lang = "ko-KR"
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      statusRef.current = "listening"
      setStatus("listening")
    }
    recognition.onresult = (event) => {
      const nextTranscript = readSpeechTranscript(event)

      if (!nextTranscript.text) {
        return
      }

      transcriptTextRef.current = nextTranscript.text

      const dictationTranscript: DictationTranscript = {
        durationSeconds: getDurationSeconds(startedAtRef.current),
        isFinal: nextTranscript.isFinal,
        language: "ko",
        text: nextTranscript.text,
      }

      setTranscript(dictationTranscript)
      onTranscriptChangeRef.current?.(dictationTranscript)
    }
    recognition.onerror = (event) => {
      const message = getSpeechErrorMessage(event.error)

      recognitionRef.current = null
      statusRef.current = "error"
      setStatus("error")
      setErrorMessage(message)
    }
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }

      if (statusRef.current === "requesting-permission" || statusRef.current === "listening") {
        const nextStatus = transcriptTextRef.current ? "ready" : "idle"

        statusRef.current = nextStatus
        setStatus(nextStatus)
      }
    }

    try {
      recognition.start()
    } catch {
      const message = "음성 입력을 시작하지 못했어요."

      recognitionRef.current = null
      statusRef.current = "error"
      setStatus("error")
      setErrorMessage(message)
    }
  }, [])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current

    if (!recognition) {
      return
    }

    recognitionRef.current = null
    recognition.stop()

    const nextStatus = transcriptTextRef.current ? "ready" : "idle"
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  return {
    errorMessage,
    reset,
    start,
    status,
    stop,
    transcript,
  }
}

function getBrowserSpeechRecognition() {
  if (typeof window === "undefined") return undefined

  const speechWindow = window as BrowserSpeechRecognitionWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

function readSpeechTranscript(event: SpeechRecognitionEventLike) {
  const parts: string[] = []
  let isFinal = true

  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index]
    const transcript = result?.[0]?.transcript?.trim()

    if (result && result.isFinal === false) {
      isFinal = false
    }

    if (transcript) {
      parts.push(transcript)
    }
  }

  return {
    isFinal,
    text: parts.join(" ").replace(/\s+/g, " ").trim(),
  }
}

function getDurationSeconds(startedAt: number | null) {
  if (startedAt === null) {
    return undefined
  }

  return Math.round((Date.now() - startedAt) / 1000)
}

function getSpeechErrorMessage(error?: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "마이크 권한이 필요해요."
  }

  if (error === "no-speech") {
    return "음성이 들리지 않았어요."
  }

  if (error === "audio-capture") {
    return "마이크를 찾지 못했어요."
  }

  if (error === "network") {
    return "음성 인식 네트워크 오류가 발생했어요."
  }

  return "음성 입력을 처리하지 못했어요."
}
