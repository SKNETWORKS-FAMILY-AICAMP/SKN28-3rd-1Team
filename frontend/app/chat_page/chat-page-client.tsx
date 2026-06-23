"use client"

import Image from "next/image"
import Link from "next/link"
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  Brain,
  FileText,
  List,
  Map as MapIcon,
  Monitor,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
  Phone,
  Plus,
  Save,
  Send,
  Volume2,
  Wrench,
} from "lucide-react"

import { MessageResponse } from "@/components/ai-elements/message"
import { Button } from "@/components/ui/button"
import { useBrowserSpeechDictation } from "@/components/voice/hooks/use-browser-speech-dictation"
import { VoiceInputButton } from "@/components/voice/surfaces/voice-input-button/surface"
import type { DictationStatus, DictationTranscript } from "@/components/voice/types"
import { useChatSession } from "@/features/chat/hooks/use-chat-session"
import type { TtsPlaybackStatus } from "@/features/chat/services/tts-streaming-audio-player"
import type { ChatMessageData, LegalChatMessage } from "@/features/chat/types"
import { cn } from "@/lib/utils"

type Institution = {
  name: string
  x: number
  y: number
  tier: 0 | 1 | 2
  badges: string[]
  phone: string
  address: string
  hours: string
  business: string
  apply: string
  docs: string
}

type DocumentSource = {
  title: string
  source: string
  category: string
  page: string
  updated: string
  match: number
  tags: string[]
  summary: string
  highlights: string[]
  citation: string
}

const institutions: Institution[] = [
  {
    name: "강남시니어클럽",
    x: 54,
    y: 48,
    tier: 0,
    badges: ["수행기관", "공익활동", "사회서비스형"],
    phone: "02-123-4567",
    address: "서울특별시 강남구 선릉로 123길 45",
    hours: "평일 09:00 - 18:00",
    business: "노인일자리 및 사회활동 지원사업 운영 (공익활동, 사회서비스형, 시장형)",
    apply: "방문 접수 또는 전화 문의 후 상담",
    docs: "신분증, 주민등록등본, 통장사본 등",
  },
  {
    name: "역삼노인종합복지관",
    x: 40,
    y: 67,
    tier: 1,
    badges: ["수행기관", "공익활동"],
    phone: "02-234-5678",
    address: "서울특별시 강남구 역삼로 200",
    hours: "평일 09:00 - 18:00",
    business: "노인 공익활동형 일자리 운영 및 지역사회 참여 지원",
    apply: "복지관 방문 접수 후 상담 진행",
    docs: "신분증, 주민등록등본",
  },
  {
    name: "신사종합사회복지관",
    x: 30,
    y: 38,
    tier: 2,
    badges: ["수행기관", "시장형사업단"],
    phone: "02-345-6789",
    address: "서울특별시 강남구 압구정로 50",
    hours: "평일 09:00 - 17:00",
    business: "시장형사업단(카페, 매장 등) 운영 및 일자리 연계",
    apply: "전화 예약 후 방문 상담",
    docs: "신분증, 통장사본",
  },
]

const documentSources: DocumentSource[] = [
  {
    title: "노인일자리 사업 신청 안내",
    source: "공공 신청 안내 자료",
    category: "신청 자격",
    page: "p. 6-9",
    updated: "2026.01",
    match: 94,
    tags: ["참여 조건", "신청 절차", "준비 서류"],
    summary: "만 60세 이상 또는 사업 유형별 참여 가능 연령, 신청 전 확인해야 할 소득·건강보험 기준, 접수 순서를 정리한 문서예요.",
    highlights: ["신분증과 주민등록등본을 기본 서류로 확인", "지역 수행기관 상담 후 세부 사업 배정", "사업 유형별 참여 조건이 다를 수 있음"],
    citation: "신청자는 주소지 기준 수행기관에서 상담을 먼저 받고, 사업 유형에 맞는 서류를 준비합니다.",
  },
  {
    title: "강남구 수행기관 모집 공고 예시",
    source: "지자체 공고 참고 자료",
    category: "지역 기관",
    page: "p. 2-4",
    updated: "2026.02",
    match: 88,
    tags: ["강남구", "수행기관", "접수처"],
    summary: "강남구 안에서 상담과 접수를 맡는 수행기관 목록, 연락처, 방문 접수 기준을 화면 결과와 함께 확인하기 위한 자료예요.",
    highlights: ["기관별 운영 시간이 달라 방문 전 전화 확인 필요", "거주지와 가까운 기관부터 상담 권장", "모집 기간 종료 후 대기 접수가 될 수 있음"],
    citation: "모집 기관은 접수 기간, 사업 유형, 배정 인원에 따라 신청 가능 여부가 달라집니다.",
  },
  {
    title: "노인일자리 상담 FAQ",
    source: "상담 응대 참고 자료",
    category: "자주 묻는 질문",
    page: "Q3-Q6",
    updated: "2025.12",
    match: 81,
    tags: ["FAQ", "나이 기준", "중복 참여"],
    summary: "처음 신청하는 사용자가 자주 묻는 나이 조건, 다른 복지 서비스와의 중복 가능 여부, 접수 후 진행 절차를 요약했어요.",
    highlights: ["기초 정보 확인 후 상담 질문을 구체화", "사업별 중복 참여 제한 여부 확인", "접수 후 선발 결과 안내까지 시간이 걸릴 수 있음"],
    citation: "처음 신청하는 경우에도 상담자가 거주지와 생년 정보를 기준으로 가능한 사업을 안내할 수 있습니다.",
  },
]

const CHAT_SIDEBAR_DEFAULT_WIDTH = 476
const CHAT_SIDEBAR_MIN_WIDTH = 420
const CHAT_SIDEBAR_MAX_WIDTH = 640
const TRACE_DRAWER_DEFAULT_WIDTH = 320
const TRACE_DRAWER_MIN_WIDTH = 260
const TRACE_DRAWER_MAX_WIDTH = 460

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function tierColor(tier: Institution["tier"]) {
  if (tier === 0) return "#5fb87f"
  if (tier === 1) return "#ef9a52"
  return "#b3aaa0"
}

function tierLabel(tier: Institution["tier"]) {
  if (tier === 0) return "1km 이내"
  if (tier === 1) return "1~2km 이내"
  return "2km 이상"
}

function badgeClassName(label: string) {
  if (label === "수행기관") return "bg-[#fbe3d2] text-[#cf7838]"
  if (label === "공익활동") return "bg-[#d9efe0] text-[#3f9a63]"
  if (label === "사회서비스형") return "bg-[#dbe7f3] text-[#4a77ad]"
  if (label === "시장형사업단") return "bg-[#e9e1f2] text-[#7a64ad]"
  return "bg-[#eee5d8] text-[#8a7d6c]"
}

function mergeSpeechTranscript(baseInput: string, transcript: string) {
  const base = baseInput.trim()
  const text = transcript.trim()

  if (!base) return text
  if (!text) return base
  return `${base} ${text}`
}

function isSpeechShortcut(event: KeyboardEvent) {
  const isMKey = event.key.toLowerCase() === "m" || event.code === "KeyM"
  return isMKey && event.shiftKey && (event.ctrlKey || event.metaKey) && !event.altKey
}

function canToggleSpeechStatus(status: DictationStatus) {
  return status !== "unsupported" && status !== "requesting-permission" && status !== "loading-model" && status !== "transcribing"
}

export function ChatPageClient() {
  const {
    messages,
    input,
    setInput,
    birthYear,
    setBirthYear,
    location: residence,
    setLocation: setResidence,
    send,
    status,
    error,
    isBusy,
    ttsPlaybackStatus,
    reset,
  } = useChatSession()
  const [isProfileStep, setIsProfileStep] = useState(false)
  const [tab, setTab] = useState<"map" | "list">("map")
  const [selectedId, setSelectedId] = useState(0)
  const [showDocuments, setShowDocuments] = useState(false)
  const [showDocumentDetail, setShowDocumentDetail] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState(0)
  const [isTraceExpanded, setIsTraceExpanded] = useState(false)
  const [chatSidebarWidth, setChatSidebarWidth] = useState(CHAT_SIDEBAR_DEFAULT_WIDTH)
  const [traceDrawerWidth, setTraceDrawerWidth] = useState(TRACE_DRAWER_DEFAULT_WIDTH)
  const [toast, setToast] = useState("")
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const speechBaseInputRef = useRef("")
  const messageTimestampCacheRef = useRef(new Map<string, string>())
  const handleSpeechTranscript = useCallback((transcript: DictationTranscript) => {
    setInput(mergeSpeechTranscript(speechBaseInputRef.current, transcript.text))
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }, [setInput])
  const dictation = useBrowserSpeechDictation({ onTranscriptChange: handleSpeechTranscript })

  const selected = institutions[selectedId]
  const selectedDocument = documentSources[selectedDocumentId]
  const started = messages.some((message) => message.role === "user")
  const messageTimestamps = useMemo(() => getMessageTimestampMap(messages, messageTimestampCacheRef.current), [messages])
  const agentTraceLanes = useMemo(() => collectAgentTraceLanes(messages, ttsPlaybackStatus), [messages, ttsPlaybackStatus])
  const agentTraceItemCount = agentTraceLanes.reduce((count, lane) => count + lane.items.length, 0)
  const totalSidebarWidth = chatSidebarWidth + (isTraceExpanded ? traceDrawerWidth : 0)
  const chatSidebarStyle = {
    "--chat-sidebar-width": `${chatSidebarWidth}px`,
    width: chatSidebarWidth,
  } as CSSProperties
  const personalizedSuggestions = useMemo(() => {
    const place = residence.trim()
    const year = birthYear.trim()

    return [
      `${place || "우리 동네"}에서 신청할 수 있는 노인일자리 알려줘`,
      year ? `${year}년생도 신청 가능한 일자리 조건 알려줘` : "신청 가능한 나이와 조건 알려줘",
      `${place || "우리 동네"}에서 가장 가까운 수행기관 알려줘`,
    ]
  }, [birthYear, residence])
  useEffect(() => {
    const element = messagesRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [messages, isBusy])

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(""), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const handleChatSidebarResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = chatSidebarWidth
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect

      const handlePointerMove = (moveEvent: PointerEvent) => {
        setChatSidebarWidth(
          clampNumber(startWidth + moveEvent.clientX - startX, CHAT_SIDEBAR_MIN_WIDTH, CHAT_SIDEBAR_MAX_WIDTH),
        )
      }

      const handlePointerUp = () => {
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", handlePointerUp)
        window.removeEventListener("pointercancel", handlePointerUp)
      }

      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerUp)
      window.addEventListener("pointercancel", handlePointerUp)
    },
    [chatSidebarWidth],
  )

  const handleTraceDrawerResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = traceDrawerWidth
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect

      const handlePointerMove = (moveEvent: PointerEvent) => {
        setTraceDrawerWidth(
          clampNumber(startWidth + moveEvent.clientX - startX, TRACE_DRAWER_MIN_WIDTH, TRACE_DRAWER_MAX_WIDTH),
        )
      }

      const handlePointerUp = () => {
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", handlePointerUp)
        window.removeEventListener("pointercancel", handlePointerUp)
      }

      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerUp)
      window.addEventListener("pointercancel", handlePointerUp)
    },
    [traceDrawerWidth],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSpeechShortcut(event) || isBusy || !canToggleSpeechStatus(dictation.status)) return

      event.preventDefault()
      toggleSpeechInput()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!started && !isProfileStep) {
      setIsProfileStep(true)
      return
    }

    dictation.reset()
    send(input)
  }

  function toggleSpeechInput() {
    if (dictation.status === "listening") {
      dictation.stop()
      return
    }

    speechBaseInputRef.current = input
    dictation.start()
    inputRef.current?.focus()
  }

  function resetChat() {
    dictation.reset()
    reset()
    setIsProfileStep(false)
    setTab("map")
    setSelectedId(0)
    setShowDocuments(false)
    setShowDocumentDetail(false)
    setSelectedDocumentId(0)
    setIsTraceExpanded(false)
    setToast("새 상담을 시작했어요.")
  }

  return (
    <main className="flex h-dvh min-h-[660px] flex-col overflow-hidden bg-[#ece7e0] text-[#3a342e] dark:bg-background dark:text-foreground">
      <header className="flex h-16 shrink-0 items-center gap-8 border-b border-[#efe7da] dark:border-border bg-white dark:bg-card px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] ring-1 ring-[#f4d6bd]">
            <Image src="/images/mascot.png" alt="로디" width={40} height={40} className="size-10 object-cover" />
          </span>
          <span className="font-heading text-xl text-[#33302b] dark:text-foreground">로디</span>
        </div>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[#7c736a] dark:text-muted-foreground md:flex">
          <span>상담 주제</span>
          <span>이용 방법</span>
          <Link href="/mocks" className="font-medium transition-colors hover:text-[#33302b] dark:hover:text-foreground">
            디자인
          </Link>
          <button
            type="button"
            onClick={() => {
              if (!started) {
                setToast("상담을 시작하면 근거 문서를 볼 수 있어요.")
                return
              }
              setShowDocuments(true)
              setShowDocumentDetail(false)
            }}
            className="font-medium"
          >
            근거 문서
          </button>
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setToast("상담 요약을 저장했어요.")}
            className="hidden h-10 items-center gap-2 rounded-[10px] border border-[#ead9c6] dark:border-border bg-white dark:bg-card px-4 text-sm font-semibold text-[#6c6359] dark:text-muted-foreground sm:inline-flex"
          >
            <Save className="size-4 text-[#ef8b54]" />
            상담 요약 저장
          </button>
          <button
            type="button"
            onClick={resetChat}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#ead9c6] dark:border-border bg-white dark:bg-card px-4 text-sm font-semibold text-[#6c6359] dark:text-muted-foreground"
          >
            <Plus className="size-4 text-[#ef8b54]" />
            새 상담
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="flex shrink-0 flex-col overflow-hidden border-r border-[#efe7da] dark:border-border bg-[#fbf6ef] dark:bg-sidebar transition-[width] duration-200"
          style={{ width: totalSidebarWidth }}
        >
          <div className="flex min-h-0 flex-1">
            <div className="relative flex shrink-0 flex-col" style={chatSidebarStyle}>
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#efe7da] dark:border-border px-4">
                <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#9a8f82]">상담</span>
                <button
                  type="button"
                  onClick={() => setIsTraceExpanded((current) => !current)}
                  className={cn(
                     "inline-flex h-8 items-center gap-1.5 rounded-[9px] border px-2.5 text-xs font-bold transition",
                     isTraceExpanded
                       ? "border-[#ef8b54] bg-[#ef8b54] text-white"
                       : "border-[#ead9c6] dark:border-border bg-white dark:bg-card text-[#6c6359] dark:text-muted-foreground hover:border-[#f0b88e]",
                  )}
                  aria-expanded={isTraceExpanded}
                  aria-label={isTraceExpanded ? "에이전트 trace 닫기" : "에이전트 trace 열기"}
                >
                  {isTraceExpanded ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
                  Trace
                  {agentTraceItemCount > 0 ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px]",
                        isTraceExpanded ? "bg-white/18 text-white" : "bg-[#f4ecdf] dark:bg-muted text-[#8a7c69] dark:text-muted-foreground",
                      )}
                    >
                      {agentTraceItemCount}
                    </span>
                  ) : null}
                </button>
              </div>

              <div
                ref={messagesRef}
                className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-4 [scrollbar-color:#d8c7b7_transparent] [scrollbar-width:thin]"
              >
                {messages.length === 0 ? <SidebarGreeting /> : null}
                {messages.map((message) => (
                  <SidebarChatMessage key={message.id} message={message} timestamp={messageTimestamps.get(message.id)} />
                ))}

                {status === "submitted" && messages.at(-1)?.role === "user" ? <SidebarPendingMessage /> : null}
              </div>

              <form
                className="p-4 pt-0"
                onSubmit={handleChatSubmit}
              >
                <div className="flex items-center gap-2 rounded-[14px] border border-[#ecd9c4] dark:border-border bg-white dark:bg-card py-2.5 pl-4 pr-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value)
                      if (dictation.status !== "listening") {
                        speechBaseInputRef.current = event.target.value
                      }
                    }}
                    disabled={isBusy}
                    placeholder="메시지를 입력하세요..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#4a423a] dark:text-foreground outline-none placeholder:text-[#b1a597]"
                  />
                  <VoiceInputButton
                    ariaKeyShortcuts="Control+Shift+M Meta+Shift+M"
                    compact
                    status={dictation.status}
                    onClick={toggleSpeechInput}
                    className="shrink-0"
                  />
                  <Button
                    type="submit"
                    disabled={isBusy || !input.trim()}
                    size="icon-lg"
                    variant="default"
                    className="size-10 shrink-0 rounded-[11px] bg-[#ef8b54] text-white shadow-[0_2px_6px_rgba(239,139,84,.35)] disabled:opacity-50"
                    aria-label="전송"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
                <div className="mt-2 min-h-4 px-1 text-xs font-semibold">
                  {dictation.status === "listening" ? (
                    <span className="text-[#ef8b54]">듣는 중...</span>
                  ) : dictation.status === "requesting-permission" ? (
                    <span className="text-[#9a8f82]">마이크 확인 중...</span>
                  ) : dictation.errorMessage ? (
                    <span className="text-[#c15b45]">{dictation.errorMessage}</span>
                  ) : error ? (
                    <span className="text-[#c15b45]">{error.message}</span>
                  ) : null}
                </div>
              </form>

              <button
                type="button"
                aria-label="상담 사이드바 너비 조절"
                className="absolute right-0 top-0 z-10 h-full w-2 translate-x-1/2 cursor-col-resize rounded-full transition hover:bg-[#ef8b54]/25 focus-visible:bg-[#ef8b54]/25 focus-visible:outline-none"
                onPointerDown={handleChatSidebarResizePointerDown}
              />
            </div>

            {isTraceExpanded ? (
              <AgentTraceDrawer
                lanes={agentTraceLanes}
                onClose={() => setIsTraceExpanded(false)}
                onResizePointerDown={handleTraceDrawerResizePointerDown}
                width={traceDrawerWidth}
              />
            ) : null}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {started ? (
            <>
              <div className="flex min-h-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col p-6 pb-4">
                  <h1 className="text-2xl font-extrabold tracking-tight text-[#2f2b26]">
                    {showDocuments ? "상담 근거 문서" : "강남구 노인일자리 신청 가능 기관"}
                  </h1>
                  <p className="mt-1.5 text-sm text-[#8c8276]">
                    {showDocuments
                      ? "추천 결과에 활용한 문서와 확인 포인트를 볼 수 있어요."
                      : "지도에서 기관을 선택하면 상세 정보를 확인할 수 있어요."}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex w-max gap-1.5 rounded-xl bg-[#f1ebe1] p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTab("map")
                          setShowDocuments(false)
                          setShowDocumentDetail(false)
                        }}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-[9px] px-5 py-2 text-sm font-semibold",
                          tab === "map" && !showDocuments ? "bg-white text-[#33302b] shadow-sm" : "text-[#9a8f82]",
                        )}
                      >
                        <MapIcon className="size-4" />
                        지도
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTab("list")
                          setShowDocuments(false)
                          setShowDocumentDetail(false)
                        }}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-[9px] px-5 py-2 text-sm font-semibold",
                          tab === "list" && !showDocuments ? "bg-white text-[#33302b] shadow-sm" : "text-[#9a8f82]",
                        )}
                      >
                        <List className="size-4" />
                        목록
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDocuments((current) => !current)
                        setShowDocumentDetail(false)
                      }}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-bold transition",
                        showDocuments
                          ? "border-[#ef8b54] bg-[#ef8b54] text-white shadow-[0_3px_10px_rgba(239,139,84,.24)]"
                          : "border-[#ead9c6] bg-white text-[#6c6359]",
                      )}
                    >
                      <FileText className="size-4" />
                      {showDocuments ? "기관 보기" : "문서 레퍼런스"}
                    </button>
                  </div>

                  {showDocuments ? (
                    showDocumentDetail ? (
                      <DocumentDetailPanel
                        document={selectedDocument}
                        documents={documentSources}
                        selectedDocumentId={selectedDocumentId}
                        onBack={() => setShowDocumentDetail(false)}
                        onSelectDocument={(index) => {
                          setSelectedDocumentId(index)
                          setShowDocumentDetail(true)
                        }}
                      />
                    ) : (
                    <div className="mt-3.5 grid min-h-0 flex-1 auto-rows-max grid-cols-1 content-start items-start gap-3 overflow-y-auto pr-1 xl:grid-cols-2">
                      {documentSources.map((document, index) => {
                        const isSelected = index === selectedDocumentId
                        return (
                          <button
                            key={document.title}
                            type="button"
                            onClick={() => {
                              setSelectedDocumentId(index)
                              setShowDocumentDetail(true)
                            }}
                            className={cn(
                              "flex min-h-[210px] flex-col rounded-[14px] border bg-white px-4 py-3.5 text-left transition",
                              isSelected ? "border-[#f0b88e] shadow-[0_3px_12px_rgba(239,139,84,.14)]" : "border-[#efe7da]",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={cn(
                                  "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                                  isSelected ? "bg-[#ef8b54] text-white" : "bg-[#f6eee3] text-[#ef8b54]",
                                )}
                              >
                                <FileText className="size-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xl font-extrabold leading-snug text-[#332f29]">{document.title}</div>
                                <div className="mt-1 text-xs font-semibold text-[#9a8f82]">
                                  {document.source} · {document.page}
                                </div>
                              </div>
                              <span className="rounded-[8px] bg-[#d9efe0] px-2.5 py-1 text-xs font-extrabold text-[#3f9a63]">
                                {document.match}%
                              </span>
                            </div>

                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {document.tags.map((tag) => (
                                <span key={tag} className="rounded-lg bg-[#f4ecdf] px-2.5 py-1 text-xs font-semibold text-[#7c7064]">
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <p className="mt-2.5 line-clamp-3 text-lg leading-relaxed text-[#5f574d]">{document.summary}</p>
                          </button>
                        )
                      })}
                    </div>
                    )
                  ) : tab === "map" ? (
                <div className="relative mt-3.5 min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#ece3d5] bg-[#eef1ec]">
                  <div className="absolute inset-0 bg-linear-to-b from-[#eef1ec] to-[#edf0ea]" />
                  <div className="absolute -right-[4%] -top-[6%] h-[55%] w-[40%] rotate-[-8deg] rounded-bl-[60%] bg-[#d8e6ee]" />
                  <div className="absolute left-[8%] top-[18%] h-[30%] w-[26%] rounded-[40%_50%_45%_55%] bg-[#dcebd9]" />
                  <div className="absolute bottom-[10%] right-[14%] h-[26%] w-[22%] rounded-[55%_45%_50%_40%] bg-[#dcebd9]" />
                  <div className="absolute left-0 top-[46%] h-[9px] w-full bg-white shadow-[0_0_0_1px_#e7e2d6]" />
                  <div className="absolute left-[38%] top-0 h-full w-[9px] bg-white shadow-[0_0_0_1px_#e7e2d6]" />
                  <div className="absolute left-0 top-[22%] h-[5px] w-full bg-white/85" />
                  <div className="absolute left-[70%] top-0 h-full w-[5px] bg-white/85" />
                  <div className="absolute left-[-10%] top-[60%] h-1.5 w-[130%] origin-left rotate-[-18deg] bg-[#fbe0bf]" />

                  <span className="absolute left-[26%] top-[18%] text-[11px] text-[#9aa18f]">선릉역</span>
                  <span className="absolute left-[54%] top-[39%] text-[11px] text-[#9aa18f]">강남역</span>
                  <span className="absolute bottom-[18%] left-[22%] text-[11px] text-[#9aa18f]">역삼역</span>

                  {institutions.map((institution, index) => {
                    const isSelected = index === selectedId
                    return (
                      <button
                        key={institution.name}
                        type="button"
                        onClick={() => setSelectedId(index)}
                        className="absolute z-10 -translate-x-1/2 -translate-y-full"
                        style={{ left: `${institution.x}%`, top: `${institution.y}%` }}
                        aria-label={institution.name}
                      >
                        <span
                          className={cn(
                            "flex items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-[0_4px_10px_rgba(0,0,0,.18)]",
                            isSelected ? "size-9 ring-[5px] ring-[#ef8b54]/20" : "size-7",
                          )}
                          style={{ backgroundColor: isSelected ? "#ef8b54" : tierColor(institution.tier) }}
                        >
                          {index + 1}
                        </span>
                      </button>
                    )
                  })}

                  <div className="absolute bottom-3 left-3 flex gap-4 rounded-[9px] bg-white/80 px-3 py-2 text-xs text-[#7c7468] backdrop-blur">
                    {[0, 1, 2].map((tier) => (
                      <span key={tier} className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: tierColor(tier as Institution["tier"]) }} />
                        {tierLabel(tier as Institution["tier"])}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3.5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                  {institutions.map((institution, index) => {
                    const isSelected = index === selectedId
                    return (
                      <button
                        key={institution.name}
                        type="button"
                        onClick={() => setSelectedId(index)}
                        className={cn(
                          "rounded-[14px] border bg-white p-4 text-left transition",
                          isSelected ? "border-[#f0b88e] shadow-[0_3px_12px_rgba(239,139,84,.14)]" : "border-[#efe7da]",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full text-sm font-bold text-white",
                              isSelected ? "bg-[#ef8b54]" : "bg-[#e8ddce]",
                            )}
                          >
                            {index + 1}
                          </span>
                          <span className="text-base font-bold text-[#332f29]">{institution.name}</span>
                          <span className="flex-1" />
                          <span
                            className="rounded-[7px] px-2.5 py-1 text-xs font-semibold"
                            style={{ color: tierColor(institution.tier), backgroundColor: `${tierColor(institution.tier)}1f` }}
                          >
                            {tierLabel(institution.tier)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {institution.badges.map((badge) => (
                            <span key={badge} className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", badgeClassName(badge))}>
                              {badge}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm text-[#8a8073]">
                          <Navigation className="size-4 text-[#ef9a52]" />
                          {institution.address}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

                {!showDocuments ? (
                <aside className="flex w-[312px] shrink-0 flex-col p-6 pl-0">
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-[#efe7da] bg-white p-5">
                      <>
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 items-center justify-center rounded-full bg-[#ef8b54] text-sm font-bold text-white">
                            {selectedId + 1}
                          </span>
                          <h2 className="text-lg font-extrabold text-[#2f2b26]">{selected.name}</h2>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {selected.badges.map((badge) => (
                            <span key={badge} className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", badgeClassName(badge))}>
                              {badge}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-col gap-3 text-sm text-[#574f46]">
                          <div className="flex items-center gap-2.5">
                            <Phone className="size-4 text-[#ef9a52]" />
                            {selected.phone}
                          </div>
                          <div className="flex items-start gap-2.5">
                            <Navigation className="mt-0.5 size-4 text-[#ef9a52]" />
                            <span>{selected.address}</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <FileText className="size-4 text-[#ef9a52]" />
                            {selected.hours}
                          </div>
                        </div>

                        <div className="my-4 h-px bg-[#f0e8db]" />

                        <div className="flex flex-col gap-4 text-sm leading-relaxed text-[#4d463d]">
                          <InfoBlock label="주요 사업" value={selected.business} />
                          <InfoBlock label="신청 방법" value={selected.apply} />
                          <InfoBlock label="준비 서류" value={selected.docs} />
                        </div>

                        <div className="flex-1" />
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setToast(`전화 연결: ${selected.phone}`)}
                            className="flex h-11 flex-1 items-center justify-center rounded-[11px] bg-[#ef8b54] text-sm font-bold text-white shadow-[0_2px_8px_rgba(239,139,84,.3)]"
                          >
                            전화 문의
                          </button>
                          <button
                            type="button"
                            onClick={() => setToast(`${selected.name} 길찾기를 여는 중...`)}
                            className="flex h-11 flex-1 items-center justify-center rounded-[11px] border border-[#f0b88e] bg-white text-sm font-bold text-[#e07e43]"
                          >
                            길찾기
                          </button>
                        </div>
                      </>
                  </div>
                </aside>
                ) : null}
              </div>

            </>
          ) : isProfileStep ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-10 py-8 text-center">
              <span className="flex size-[84px] items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] shadow-[inset_0_0_0_2px_#f4d6bd,0_10px_26px_rgba(239,139,84,.13)]">
                <Image src="/images/mascot.png" alt="로디" width={84} height={84} className="size-full object-cover" priority />
              </span>
              <h1 className="mt-5 text-[24px] font-extrabold text-[#2f2b26]">상담 정보를 알려주세요</h1>
              <p className="mt-3 max-w-[420px] text-[15px] leading-[1.65] text-[#8c8276]">
                태어난 년도와 사는 곳을 적어주시면 신청 조건과 가까운 기관을 더 잘 찾아드릴게요.
              </p>

              <div className="mt-6 grid w-full max-w-[520px] gap-3 sm:grid-cols-2">
                <label className="rounded-[13px] border border-[#efe0cd] bg-white px-4 py-3 text-left">
                  <span className="text-xs font-extrabold text-[#9a8f82]">태어난 년도</span>
                  <input
                    value={birthYear}
                    onChange={(event) => setBirthYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    placeholder="예: 1958"
                    className="mt-2 w-full bg-transparent text-base font-semibold text-[#403a33] outline-none placeholder:text-[#c1b5a7]"
                  />
                </label>
                <label className="rounded-[13px] border border-[#efe0cd] bg-white px-4 py-3 text-left">
                  <span className="text-xs font-extrabold text-[#9a8f82]">사는 곳</span>
                  <input
                    value={residence}
                    onChange={(event) => setResidence(event.target.value)}
                    placeholder="예: 서울 강남구"
                    className="mt-2 w-full bg-transparent text-base font-semibold text-[#403a33] outline-none placeholder:text-[#c1b5a7]"
                  />
                </label>
              </div>

              <div className="mt-[30px] flex w-full max-w-[520px] flex-col gap-2.5">
                {personalizedSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={isBusy}
                    onClick={() => void send(suggestion)}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-[13px] border border-[#efe0cd] bg-white px-[18px] py-[15px] text-left text-[14.5px] font-semibold text-[#5b5249] transition hover:border-[#f0b88e] hover:shadow-[0_4px_14px_rgba(239,139,84,.13)] disabled:opacity-60"
                  >
                    <span>{suggestion}</span>
                    <ArrowRight className="size-4 shrink-0 text-[#ef8b54]" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-10 py-8 text-center">
              <button
                type="button"
                onClick={() => setIsProfileStep(true)}
                className="group flex flex-col items-center rounded-[18px] px-6 py-5 transition hover:bg-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ef8b54]"
              >
                <span className="flex size-[min(440px,52vw,46vh)] items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] shadow-[inset_0_0_0_2px_#f4d6bd,0_24px_60px_rgba(239,139,84,.22)] transition group-hover:scale-[1.03]">
                  <Image src="/images/mascot.png" alt="로디" width={440} height={440} className="size-full object-cover" priority />
                </span>
                <span className="mt-7 text-[26px] font-extrabold text-[#2f2b26]">안녕하세요, 로디에요</span>
              </button>
              <p className="mt-1 max-w-[400px] text-[15px] leading-[1.65] text-[#8c8276]">
                로디를 누르고 상담 정보를 먼저 알려주세요.
              </p>
            </div>
          )}
        </section>
      </div>

      {toast ? (
        <div className="fixed bottom-7 left-1/2 z-50 -translate-x-1/2 rounded-[11px] bg-[#3a342e] px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,.2)]">
          {toast}
        </div>
      ) : null}
    </main>
  )
}

function SidebarAvatar({ isUser = false }: { isUser?: boolean }) {
  return (
    <div
      className={cn(
        "flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full",
        isUser ? "bg-[#e8ddce] text-xs font-bold text-[#8a7c69]" : "bg-[#fbe6d4] ring-1 ring-[#f4d6bd]",
      )}
    >
      {isUser ? "나" : <Image src="/images/mascot.png" alt="" width={30} height={30} className="size-[30px] object-cover" />}
    </div>
  )
}

function SidebarGreeting() {
  return (
    <div className="flex items-start gap-2">
      <SidebarAvatar />
      <div className="max-w-[calc(var(--chat-sidebar-width)-112px)] rounded-[4px_14px_14px_14px] border border-[#eee3d6] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#403a33]">
        안녕하세요, 로디에요!
        <br />
        궁금한 점을 편하게 물어보세요.
      </div>
    </div>
  )
}

function SidebarPendingMessage() {
  return (
    <div className="flex items-start gap-2">
      <SidebarAvatar />
      <div className="flex gap-1 rounded-[4px_14px_14px_14px] border border-[#eee3d6] bg-white px-4 py-3.5">
        <span className="size-1.5 animate-pulse rounded-full bg-[#e6a878]" />
        <span className="size-1.5 animate-pulse rounded-full bg-[#e6a878] [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-[#e6a878] [animation-delay:300ms]" />
      </div>
    </div>
  )
}

function getMessageText(message: LegalChatMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function getDataParts<TName extends keyof ChatMessageData & string>(
  message: LegalChatMessage,
  name: TName,
) {
  return message.parts.filter((part) => part.type === `data-${name}`) as Array<{
    type: `data-${TName}`
    id?: string
    data: ChatMessageData[TName]
  }>
}

function getMessageTimestampValue(message: LegalChatMessage) {
  return getDataParts(message, "messageTimestamp").at(-1)?.data.timestamp
}

function getMessageTimestampMap(messages: LegalChatMessage[], cache: Map<string, string>) {
  const activeIds = new Set(messages.map((message) => message.id))

  for (const messageId of cache.keys()) {
    if (!activeIds.has(messageId)) cache.delete(messageId)
  }

  for (const message of messages) {
    const timestamp = getMessageTimestampValue(message)
    if (timestamp) cache.set(message.id, timestamp)
    else if (!cache.has(message.id)) cache.set(message.id, new Date().toISOString())
  }

  return new Map(cache)
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return null

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

function MessageTimestamp({ className, timestamp }: { className?: string; timestamp?: string }) {
  const label = formatTimestamp(timestamp)
  if (!label) return null

  return <div className={cn("mt-1.5 text-right text-[10px] font-medium leading-none", className)}>{label}</div>
}

function SidebarChatMessage({ message, timestamp }: { message: LegalChatMessage; timestamp?: string }) {
  const isUser = message.role === "user"
  const textParts = message.parts.filter((part) => part.type === "text")

  if (isUser) {
    return (
      <div className="flex items-start gap-2">
        <SidebarAvatar isUser />
        <div className="min-w-0">
          <div className="max-w-[calc(var(--chat-sidebar-width)-112px)] whitespace-pre-wrap rounded-[4px_14px_14px_14px] bg-[#f7e7d8] px-3.5 py-3 text-sm leading-relaxed text-[#4a4038]">
            {getMessageText(message)}
            <MessageTimestamp timestamp={timestamp} className="text-[#a59889]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <SidebarAvatar />
      <div className="min-w-0 space-y-2">
        {textParts.length > 0 ? (
          <div className="max-w-[calc(var(--chat-sidebar-width)-112px)] rounded-[4px_14px_14px_14px] border border-[#eee3d6] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#403a33]">
            {textParts.map((part, index) => (
              <MessageResponse key={`${message.id}-text-${index}`} className="whitespace-pre-wrap leading-relaxed">
                {part.text}
              </MessageResponse>
            ))}
            <MessageTimestamp timestamp={timestamp} className="text-[#b2a79b]" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

type AgentTraceTone = "audio" | "reasoning" | "speech" | "text" | "tool"

type AgentTraceItem = {
  id: string
  title: string
  text: string
  timestamp?: string
  tone: AgentTraceTone
}

type AgentTraceLane = {
  id: string
  label: string
  items: AgentTraceItem[]
}

type AgentTraceGroup = {
  audioStatus?: ChatMessageData["audioStatus"]
  audioTimestamp?: string
  input: string
  inputTimestamp?: string
  reasoning: string
  reasoningTimestamp?: string
  speechDelta: string
  speechFinal: string
  speechTimestamp?: string
  text: string
  textFinal: string
  textFinalTimestamp?: string
  textTimestamp?: string
  tools: ChatMessageData["toolCall"][]
  toolTimestamp?: string
}

const agentTraceLaneOrder = ["main_agent", "screen_control_agent", "speech_text_agent", "speech_synthesis_node"]

const agentTraceLaneLabels: Record<string, string> = {
  main_agent: "Main Agent",
  speech_synthesis_node: "Speech Synthesis",
  speech_text_agent: "Speech Agent",
  screen_control_agent: "Screen Control Agent",
}

function createAgentTraceGroup(): AgentTraceGroup {
  return {
    input: "",
    reasoning: "",
    speechDelta: "",
    speechFinal: "",
    text: "",
    textFinal: "",
    tools: [],
  }
}

function normalizeAgentName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim()
  return trimmed || fallback
}

function formatAgentLabel(agent: string) {
  return agentTraceLaneLabels[agent] ?? agent.replaceAll("_", " ")
}

function getLatestAudioStatusMessageId(messages: LegalChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (getDataParts(messages[index], "audioStatus").length > 0) return messages[index].id
  }

  return null
}

function formatTtsPlaybackLabel(status?: TtsPlaybackStatus) {
  if (!status || status.phase === "idle" || status.chunks === 0) return null

  const modeLabel = status.mode === "blob" ? "blob fallback" : status.mode === "media-source" ? "media source" : null
  const phaseLabel = (() => {
    if (status.phase === "buffering") return status.streamCompleted ? "finalizing buffer" : "buffering"
    if (status.phase === "playing") return "playing"
    if (status.phase === "blocked") return "playback blocked"
    if (status.phase === "completed") return "playback completed"
    if (status.phase === "error") return "playback error"
    return null
  })()

  if (!phaseLabel) return null
  return modeLabel ? `${phaseLabel} (${modeLabel})` : phaseLabel
}

function formatAudioTraceText(audioStatus: ChatMessageData["audioStatus"], playbackStatus?: TtsPlaybackStatus) {
  const streamLabel = audioStatus.interrupted ? "stream interrupted" : audioStatus.completed ? "stream completed" : "streaming"
  const playbackLabel = formatTtsPlaybackLabel(playbackStatus)
  return [`${audioStatus.chunks} chunks`, streamLabel, playbackLabel].filter(Boolean).join(" · ")
}

function collectAgentTraceLanes(messages: LegalChatMessage[], ttsPlaybackStatus?: TtsPlaybackStatus): AgentTraceLane[] {
  const laneItems = new Map<string, AgentTraceItem[]>()
  const latestAudioStatusMessageId = getLatestAudioStatusMessageId(messages)

  function appendLaneItem(agent: string, item: AgentTraceItem) {
    laneItems.set(agent, [...(laneItems.get(agent) ?? []), item])
  }

  for (const message of messages) {
    if (message.role !== "assistant") continue

    const messageTimestamp = getMessageTimestampValue(message)
    const groups = new Map<string, AgentTraceGroup>()
    const ensureGroup = (agent: string) => {
      const current = groups.get(agent)
      if (current) return current

      const next = createAgentTraceGroup()
      groups.set(agent, next)
      return next
    }

    for (const part of getDataParts(message, "agentTrace")) {
      const trace = part.data
      const fallbackAgent = trace.type.startsWith("speech_text.") ? "speech_text_agent" : "main_agent"
      const agent = normalizeAgentName(trace.sourceAgent ?? trace.node, fallbackAgent)
      if (agent === "main_agent" && (trace.type === "agent.text.delta" || trace.type === "agent.text.final")) continue
      if (trace.type === "agent.reasoning.delta" && agent !== "speech_text_agent") continue

      const group = ensureGroup(agent)
      const text = trace.text ?? ""
      const timestamp = trace.timestamp ?? messageTimestamp

      if (trace.type === "agent.text.delta") {
        group.text += text
        group.textTimestamp = timestamp ?? group.textTimestamp
      } else if (trace.type === "agent.text.final") {
        group.textFinal = text || group.textFinal
        group.textFinalTimestamp = timestamp ?? group.textFinalTimestamp
      } else if (trace.type === "agent.reasoning.delta") {
        group.reasoning += text
        group.reasoningTimestamp = timestamp ?? group.reasoningTimestamp
      } else if (trace.type === "speech_text.input" || trace.type === "screen_control.input") {
        group.input = text || group.input
        group.inputTimestamp = timestamp ?? group.inputTimestamp
      } else if (trace.type === "speech_text.delta") {
        group.speechDelta += text
        group.speechTimestamp = timestamp ?? group.speechTimestamp
      } else if (trace.type === "speech_text.final") {
        group.speechFinal = text || group.speechFinal
        group.speechTimestamp = timestamp ?? group.speechTimestamp
      }
    }

    for (const part of getDataParts(message, "speechText")) {
      const agent = normalizeAgentName(part.data.sourceAgent, "speech_text_agent")
      const group = ensureGroup(agent)
      group.speechFinal = part.data.text
      group.speechTimestamp = part.data.timestamp ?? messageTimestamp ?? group.speechTimestamp
    }

    for (const part of getDataParts(message, "toolCall")) {
      const agent = normalizeAgentName(part.data.sourceAgent, "main_agent")

      const group = ensureGroup(agent)
      group.tools.push(part.data)
      group.toolTimestamp = part.data.timestamp ?? messageTimestamp ?? group.toolTimestamp
    }

    const audioStatus = getDataParts(message, "audioStatus").at(-1)?.data
    if (audioStatus) {
      const agent = normalizeAgentName(audioStatus.sourceAgent, "speech_synthesis_node")
      const group = ensureGroup(agent)
      group.audioStatus = audioStatus
      group.audioTimestamp = messageTimestamp ?? group.audioTimestamp
    }

    for (const [agent, group] of groups) {
      const input = group.input.trim()
      const reasoning = group.reasoning.trim()
      const finalText = group.textFinal.trim()
      const text = finalText || group.text.trim()
      const speechText = group.speechFinal.trim() || group.speechDelta.trim()

      if (input) {
        appendLaneItem(agent, {
          id: `${message.id}-${agent}-input`,
          title: agent === "screen_control_agent" ? "screen_control.input" : "speech_text.input",
          text: input,
          timestamp: group.inputTimestamp ?? messageTimestamp,
          tone: "speech",
        })
      }

      if (reasoning) {
        appendLaneItem(agent, {
          id: `${message.id}-${agent}-reasoning`,
          title: "agent.reasoning.delta",
          text: reasoning,
          timestamp: group.reasoningTimestamp ?? messageTimestamp,
          tone: "reasoning",
        })
      }

      if (text) {
        appendLaneItem(agent, {
          id: `${message.id}-${agent}-text`,
          title: finalText ? "agent.text.final" : "agent.text.delta",
          text,
          timestamp: group.textFinalTimestamp ?? group.textTimestamp ?? messageTimestamp,
          tone: "text",
        })
      }

      if (speechText) {
        appendLaneItem(agent, {
          id: `${message.id}-${agent}-speech`,
          title: group.speechFinal.trim() ? "speech_text.final" : "speech_text.delta",
          text: speechText,
          timestamp: group.speechTimestamp ?? messageTimestamp,
          tone: "speech",
        })
      }

      if (group.tools.length > 0) {
        appendLaneItem(agent, {
          id: `${message.id}-${agent}-tools`,
          title: "agent.tool_call.delta",
          text: group.tools
            .map((toolCall) => `${toolCall.name ?? "unknown tool"} · ${toolCall.status ?? "streaming"}`)
            .join("\n"),
          timestamp: group.toolTimestamp ?? messageTimestamp,
          tone: "tool",
        })
      }

      if (group.audioStatus) {
        appendLaneItem(agent, {
          id: `${message.id}-${agent}-audio`,
          title: "tts.audio",
          text: formatAudioTraceText(
            group.audioStatus,
            message.id === latestAudioStatusMessageId ? ttsPlaybackStatus : undefined,
          ),
          timestamp: group.audioTimestamp ?? messageTimestamp,
          tone: "audio",
        })
      }
    }
  }

  const dynamicAgents = [...laneItems.keys()].filter(
    (agent) => !agentTraceLaneOrder.includes(agent),
  )
  return [...agentTraceLaneOrder, ...dynamicAgents].map((agent) => ({
    id: agent,
    label: formatAgentLabel(agent),
    items: (laneItems.get(agent) ?? []).slice(-12),
  }))
}

function AgentTraceDrawer({
  lanes,
  onClose,
  onResizePointerDown,
  width,
}: {
  lanes: AgentTraceLane[]
  onClose: () => void
  onResizePointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  width: number
}) {
  const hasItems = lanes.some((lane) => lane.items.length > 0)

  return (
    <section className="relative flex shrink-0 flex-col border-l border-[#2a241f] bg-[#171b18] text-white" style={{ width }}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-[#f0b88e]" />
          <h2 className="text-sm font-bold">Agent Trace</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-[8px] text-white/64 transition hover:bg-white/10 hover:text-white"
          aria-label="에이전트 trace 닫기"
        >
          <PanelRightClose className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 [scrollbar-color:#594a3e_transparent] [scrollbar-width:thin]">
        {!hasItems ? (
          <div className="rounded-[8px] border border-white/10 px-3 py-2.5 text-xs leading-5 text-white/45">
            아직 수신된 internal stream이 없어요.
          </div>
        ) : null}
        {lanes.map((lane) => (
          <AgentTraceLaneSection key={lane.id} lane={lane} />
        ))}
      </div>

      <button
        type="button"
        aria-label="에이전트 trace 너비 조절"
        className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize rounded-full transition hover:bg-[#f0b88e]/25 focus-visible:bg-[#f0b88e]/25 focus-visible:outline-none"
        onPointerDown={onResizePointerDown}
      />
    </section>
  )
}

function AgentTraceLaneSection({ lane }: { lane: AgentTraceLane }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <AgentTraceLaneIcon agent={lane.id} />
          <h3 className="truncate text-[11px] font-extrabold uppercase tracking-[0.06em] text-white/52">{lane.label}</h3>
        </div>
        <span className="font-mono text-[10px] text-white/35">{lane.items.length}</span>
      </div>

      <ol className="space-y-2">
        {lane.items.length === 0 ? (
          <li className="rounded-[7px] border border-white/8 px-3 py-2 text-xs text-white/32">No stream</li>
        ) : (
          lane.items.map((item) => (
            <li key={item.id} className={cn("rounded-[7px] border px-3 py-2 text-xs", agentTraceToneClassName(item.tone))}>
              <div className="mb-1 font-bold uppercase tracking-[0.04em] opacity-70">{item.title}</div>
              <MessageResponse className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5">
                {item.text}
              </MessageResponse>
              <MessageTimestamp timestamp={item.timestamp} className="text-white/35" />
            </li>
          ))
        )}
      </ol>
    </section>
  )
}

function AgentTraceLaneIcon({ agent }: { agent: string }) {
  if (agent === "screen_control_agent") return <Monitor className="size-3.5 shrink-0 text-[#9fc7ff]" />
  if (agent === "speech_text_agent") return <Brain className="size-3.5 shrink-0 text-[#c8a8ff]" />
  if (agent === "speech_synthesis_node") return <Volume2 className="size-3.5 shrink-0 text-[#ffd27c]" />
  if (agent === "main_agent") return <Brain className="size-3.5 shrink-0 text-[#91d7ad]" />
  return <Wrench className="size-3.5 shrink-0 text-white/45" />
}

function agentTraceToneClassName(tone: AgentTraceTone) {
  switch (tone) {
    case "audio":
      return "border-[#ffd27c]/25 bg-[#ffd27c]/10 text-[#fff1cb]"
    case "reasoning":
      return "border-[#c8a8ff]/25 bg-[#c8a8ff]/10 text-[#eee2ff]"
    case "speech":
      return "border-[#9fc7ff]/25 bg-[#9fc7ff]/10 text-[#e6f0ff]"
    case "text":
      return "border-[#91d7ad]/25 bg-[#91d7ad]/10 text-[#dff8e9]"
    case "tool":
      return "border-[#f0b88e]/25 bg-[#f0b88e]/10 text-[#ffe3cf]"
  }
}

function DocumentDetailPanel({
  document,
  documents,
  selectedDocumentId,
  onBack,
  onSelectDocument,
}: {
  document: DocumentSource
  documents: DocumentSource[]
  selectedDocumentId: number
  onBack: () => void
  onSelectDocument: (index: number) => void
}) {
  return (
    <div className="mt-3.5 flex min-h-0 flex-1 gap-3">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-[#eadfce] bg-white px-7 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-[#ef8b54] text-white">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[30px] font-extrabold leading-tight text-[#2f2b26]">{document.title}</h2>
                <div className="mt-2 text-sm font-semibold text-[#9a8f82]">
                  {document.source} · {document.updated}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-[#dbe7f3] px-2.5 py-1 text-xs font-semibold text-[#4a77ad]">
                {document.category}
              </span>
              <span className="rounded-lg bg-[#d9efe0] px-2.5 py-1 text-xs font-semibold text-[#3f9a63]">
                관련도 {document.match}%
              </span>
              <span className="rounded-lg bg-[#f4ecdf] px-2.5 py-1 text-xs font-semibold text-[#7c7064]">
                {document.page}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="h-10 rounded-[10px] border border-[#ead9c6] bg-white px-4 text-sm font-bold text-[#6c6359] transition hover:border-[#f0b88e]"
          >
            문서 목록
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-[14px] bg-[#fbf6ef] p-5 text-lg leading-relaxed text-[#4d463d] sm:flex-row sm:items-start sm:gap-5">
            <div className="shrink-0 text-base font-extrabold text-[#9a8f82] sm:w-32">문서 요약</div>
            <p className="min-w-0 flex-1">{document.summary}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-[14px] border border-[#efe0cd] bg-[#fffaf3] p-5 sm:flex-row sm:items-start sm:gap-5">
            <div className="shrink-0 text-base font-extrabold text-[#9a8f82] sm:w-32">답변 근거 문장</div>
            <p className="min-w-0 flex-1 text-[17px] leading-relaxed text-[#4d463d]">{document.citation}</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="grid gap-3 lg:grid-cols-3">
            {document.highlights.map((highlight, index) => (
              <div key={highlight} className="rounded-[13px] border border-[#efe7da] bg-white p-4">
                <div className="mb-2 text-xs font-bold text-[#ef8b54]">근거 {index + 1}</div>
                <p className="text-[15px] leading-relaxed text-[#4d463d]">{highlight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {document.tags.map((tag) => (
            <span key={tag} className="rounded-lg bg-[#f4ecdf] px-2.5 py-1 text-xs font-semibold text-[#7c7064]">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex-1" />
      </div>

      <aside className="flex w-[260px] shrink-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-[#eadfce] bg-white p-3">
        {documents.map((item, index) => {
          const isSelected = index === selectedDocumentId

          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onSelectDocument(index)}
              className={cn(
                "rounded-[12px] border p-3 text-left transition",
                isSelected ? "border-[#f0b88e] bg-[#fff7ef] shadow-sm" : "border-[#efe7da] bg-white hover:border-[#f0b88e]",
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-[9px]",
                    isSelected ? "bg-[#ef8b54] text-white" : "bg-[#f6eee3] text-[#ef8b54]",
                  )}
                >
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-extrabold leading-snug text-[#332f29]">{item.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-[#9a8f82]">
                    {item.source} · {item.page}
                  </span>
                </span>
              </div>
            </button>
          )
        })}
      </aside>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-extrabold text-[#9a8f82]">{label}</div>
      <div>{value}</div>
    </div>
  )
}
