"use client"

import Image from "next/image"
import Link from "next/link"
import type { FormEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, FileText, List, Map, Navigation, Phone, Plus, Save, Send } from "lucide-react"

import { cn } from "@/lib/utils"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  time?: string
}

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

type Task = {
  label: string
  done: boolean
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

function createSessionId() {
  return `chat-page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function createMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return {
    id: `${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    time: role === "user" ? formatTime() : undefined,
  }
}

function formatTime() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date())
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

export function ChatPageClient() {
  const [sessionId, setSessionId] = useState(createSessionId)
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "안녕하세요, 로디에요!\n궁금한 점을 편하게 물어보세요.",
    ),
  ])
  const [input, setInput] = useState("")
  const [isProfileStep, setIsProfileStep] = useState(false)
  const [birthYear, setBirthYear] = useState("")
  const [residence, setResidence] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [tab, setTab] = useState<"map" | "list">("map")
  const [selectedId, setSelectedId] = useState(0)
  const [showDocuments, setShowDocuments] = useState(false)
  const [showDocumentDetail, setShowDocumentDetail] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState(0)
  const [toast, setToast] = useState("")
  const messagesRef = useRef<HTMLDivElement>(null)

  const selected = institutions[selectedId]
  const selectedDocument = documentSources[selectedDocumentId]
  const started = messages.some((message) => message.role === "user")
  const personalizedSuggestions = useMemo(() => {
    const place = residence.trim()
    const year = birthYear.trim()

    return [
      `${place || "우리 동네"}에서 신청할 수 있는 노인일자리 알려줘`,
      year ? `${year}년생도 신청 가능한 일자리 조건 알려줘` : "신청 가능한 나이와 조건 알려줘",
      `${place || "우리 동네"}에서 가장 가까운 수행기관 알려줘`,
    ]
  }, [birthYear, residence])
  const tasks: Task[] = useMemo(
    () => [
      { label: "지역 정보 확인", done: true },
      { label: "수행기관 검색", done: true },
      { label: "신청 조건 확인", done: true },
      { label: "결과 정리", done: started && !isBusy },
    ],
    [isBusy, started],
  )

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

  async function send(raw?: string) {
    const text = (raw ?? input).trim()
    if (!text || isBusy) return

    setInput("")
    setIsBusy(true)
    setMessages((current) => [...current, createMessage("user", text)])

    try {
      const response = await fetch("/api/chat_page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: createBackendMessage(text) }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(String(data.detail ?? `backend ${response.status}`))
      }

      const answer = String(data.answer ?? "").trim()
      setMessages((current) => [
        ...current,
        createMessage("assistant", answer || "답변을 받지 못했어요. 잠시 후 다시 시도해 주세요."),
      ])
    } catch {
      setMessages((current) => [
        ...current,
        createMessage("assistant", "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요."),
      ])
    } finally {
      setIsBusy(false)
    }
  }

  function createBackendMessage(text: string) {
    const profile = [
      birthYear.trim() ? `태어난 년도: ${birthYear.trim()}` : "",
      residence.trim() ? `사는 곳: ${residence.trim()}` : "",
    ].filter(Boolean)

    if (profile.length === 0) return text

    return `상담자 정보:\n${profile.join("\n")}\n\n질문:\n${text}`
  }

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!started && !isProfileStep) {
      setIsProfileStep(true)
      return
    }

    void send()
  }

  function resetChat() {
    setSessionId(createSessionId())
    setMessages([
      createMessage(
        "assistant",
        "안녕하세요, 로디에요!\n궁금한 점을 편하게 물어보세요.",
      ),
    ])
    setInput("")
    setIsProfileStep(false)
    setBirthYear("")
    setResidence("")
    setIsBusy(false)
    setTab("map")
    setSelectedId(0)
    setShowDocuments(false)
    setShowDocumentDetail(false)
    setSelectedDocumentId(0)
    setToast("새 상담을 시작했어요.")
  }

  return (
    <main className="flex h-dvh min-h-[660px] flex-col overflow-hidden bg-[#ece7e0] text-[#3a342e]">
      <header className="flex h-16 shrink-0 items-center gap-8 border-b border-[#efe7da] bg-white px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] ring-1 ring-[#f4d6bd]">
            <Image src="/images/mascot.png" alt="로디" width={40} height={40} className="size-10 object-cover" />
          </span>
          <span className="font-heading text-xl text-[#33302b]">로디</span>
        </div>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[#7c736a] md:flex">
          <span>상담 주제</span>
          <span>이용 방법</span>
          <Link href="/mocks" className="font-medium transition-colors hover:text-[#33302b]">
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
            className="hidden h-10 items-center gap-2 rounded-[10px] border border-[#ead9c6] bg-white px-4 text-sm font-semibold text-[#6c6359] sm:inline-flex"
          >
            <Save className="size-4 text-[#ef8b54]" />
            상담 요약 저장
          </button>
          <button
            type="button"
            onClick={resetChat}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#ead9c6] bg-white px-4 text-sm font-semibold text-[#6c6359]"
          >
            <Plus className="size-4 text-[#ef8b54]" />
            새 상담
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[330px] shrink-0 flex-col border-r border-[#efe7da] bg-[#fbf6ef]">
          <div ref={messagesRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-5">
            {messages.map((message) => {
              const isUser = message.role === "user"
              return (
                <div key={message.id} className="flex items-start gap-2">
                  <div
                    className={cn(
                      "flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full",
                      isUser ? "bg-[#e8ddce] text-xs font-bold text-[#8a7c69]" : "bg-[#fbe6d4] ring-1 ring-[#f4d6bd]",
                    )}
                  >
                    {isUser ? (
                      "나"
                    ) : (
                      <Image src="/images/mascot.png" alt="" width={30} height={30} className="size-[30px] object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "max-w-[236px] whitespace-pre-wrap rounded-[4px_14px_14px_14px] px-3.5 py-3 text-sm leading-relaxed",
                        isUser ? "bg-[#f7e7d8] text-[#4a4038]" : "border border-[#eee3d6] bg-white text-[#403a33]",
                      )}
                    >
                      {message.text}
                    </div>
                    {message.time ? (
                      <div className="mt-1 text-right text-[11px] text-[#b1a597]">{message.time}</div>
                    ) : null}
                  </div>
                </div>
              )
            })}

            {isBusy ? (
              <div className="flex items-start gap-2">
                <div className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] ring-1 ring-[#f4d6bd]">
                  <Image src="/images/mascot.png" alt="" width={30} height={30} className="size-[30px] object-cover" />
                </div>
                <div className="flex gap-1 rounded-[4px_14px_14px_14px] border border-[#eee3d6] bg-white px-4 py-3.5">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#e6a878]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[#e6a878] [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[#e6a878] [animation-delay:300ms]" />
                </div>
              </div>
            ) : null}
          </div>

          {started ? (
            <div className="mx-4 mb-3 rounded-[14px] border border-[#f0e7da] bg-white px-4 py-3.5">
              <div className="mb-3 text-sm font-extrabold text-[#5b5249]">작업 진행 상황</div>
              <div className="flex flex-col gap-2.5 text-sm">
                {tasks.map((task) => (
                  <div key={task.label} className="flex items-center gap-2">
                    <span className="text-xs text-[#bfae9b]">◇</span>
                    <span className="flex-1 text-[#5f574d]">{task.label}</span>
                    <span className={cn("text-xs font-bold", task.done ? "text-[#42a564]" : "text-[#e88a3f]")}>
                      {task.done ? "✓ 완료" : "◔ 진행 중"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <form
            className="p-4 pt-0"
            onSubmit={handleChatSubmit}
          >
            <div className="flex items-center gap-2 rounded-[14px] border border-[#ecd9c4] bg-white py-1.5 pl-4 pr-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isBusy}
                placeholder="메시지를 입력하세요..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[#4a423a] outline-none placeholder:text-[#b1a597]"
              />
              <button
                type="submit"
                disabled={isBusy || !input.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[#ef8b54] text-white shadow-[0_2px_6px_rgba(239,139,84,.35)] disabled:opacity-50"
                aria-label="전송"
              >
                <Send className="size-4" />
              </button>
            </div>
          </form>
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
                        <Map className="size-4" />
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
                    <div className="mt-3.5 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 xl:grid-cols-2">
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
                              "flex min-h-[178px] flex-col rounded-[14px] border bg-white p-4 text-left transition",
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
                                <div className="text-base font-extrabold leading-snug text-[#332f29]">{document.title}</div>
                                <div className="mt-1 text-xs font-semibold text-[#9a8f82]">
                                  {document.source} · {document.page}
                                </div>
                              </div>
                              <span className="rounded-[8px] bg-[#d9efe0] px-2.5 py-1 text-xs font-extrabold text-[#3f9a63]">
                                {document.match}%
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {document.tags.map((tag) => (
                                <span key={tag} className="rounded-lg bg-[#f4ecdf] px-2.5 py-1 text-xs font-semibold text-[#7c7064]">
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#5f574d]">{document.summary}</p>
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

              <div className="mx-6 mb-5 flex shrink-0 items-center gap-3 rounded-[14px] border border-[#f0e3d1] bg-[#f6eee3] px-5 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] ring-1 ring-[#f4d6bd]">
                  <Image src="/images/mascot.png" alt="" width={36} height={36} className="size-9 object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#4d453c]">더 자세한 신청 조건이나 다른 기관도 궁금하신가요?</div>
                  <div className="mt-1 text-xs text-[#9a8f82]">필요하면 목록 보기 또는 추가 검색을 도와드릴게요.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTab("list")
                    setShowDocuments(false)
                    setShowDocumentDetail(false)
                  }}
                  className="h-10 rounded-[10px] border border-[#ead9c6] bg-white px-4 text-sm font-semibold text-[#6c6359]"
                >
                  목록 보기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDocuments(false)
                    setShowDocumentDetail(false)
                    setMessages((current) => [
                      ...current,
                      createMessage("assistant", "어느 지역의 기관을 찾아드릴까요?\n예) “서초구 노인일자리 알려줘” 처럼 입력해 주세요."),
                    ])
                  }}
                  className="h-10 rounded-[10px] border border-[#ead9c6] bg-white px-4 text-sm font-semibold text-[#6c6359]"
                >
                  다른 지역 검색
                </button>
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
                <h2 className="text-[28px] font-extrabold leading-tight text-[#2f2b26]">{document.title}</h2>
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

        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[14px] bg-[#fbf6ef] p-5">
            <InfoBlock label="문서 요약" value={document.summary} />
          </div>

          <div className="rounded-[14px] border border-[#efe0cd] bg-[#fffaf3] p-5">
            <div className="mb-2 text-xs font-extrabold text-[#9a8f82]">답변 근거 문장</div>
            <p className="text-base leading-relaxed text-[#4d463d]">{document.citation}</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="grid gap-3 lg:grid-cols-3">
            {document.highlights.map((highlight, index) => (
              <div key={highlight} className="rounded-[13px] border border-[#efe7da] bg-white p-4">
                <div className="mb-2 text-xs font-bold text-[#ef8b54]">근거 {index + 1}</div>
                <p className="text-sm leading-relaxed text-[#4d463d]">{highlight}</p>
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

      <aside className="flex w-[236px] shrink-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-[#eadfce] bg-white p-3">
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
                  <span className="block text-sm font-extrabold leading-snug text-[#332f29]">{item.title}</span>
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
