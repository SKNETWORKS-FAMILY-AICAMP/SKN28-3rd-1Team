"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { suggestedQuestions, type Source } from "@/lib/mock-legal"
import { SendHorizonal, BookText, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000"

type Message = {
  id: string
  role: "user" | "assistant"
  text: string
  sources?: Source[]
  pending?: boolean
}

// backend /chat/stream의 SSE 블록(event:/data:)을 {event, data}로 파싱
function parseSseBlock(block: string): { event: string; data: unknown } | null {
  let event = "message"
  const dataLines: string[] = []
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length === 0) return null
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) }
  } catch {
    return null
  }
}

function MascotAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ffb199] ring-2 ring-[#ff764c]/30",
        className,
      )}
    >
      <Image src="/images/mascot.png" alt="로디" width={40} height={40} className="size-full object-cover" />
    </span>
  )
}

export function ChatInterface() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [age, setAge] = useState("")
  const [location, setLocation] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const sessionIdRef = useRef<string>(crypto.randomUUID())

  const send = useCallback((raw: string) => {
    const text = raw.trim()
    if (!text) return
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text }
    const pendingId = crypto.randomUUID()
    setMessages((prev) => [...prev, userMsg, { id: pendingId, role: "assistant", text: "", pending: true }])
    setInput("")

    const patch = (changes: Partial<Message>) =>
      setMessages((prev) => prev.map((m) => (m.id === pendingId ? { ...m, ...changes } : m)))

    void (async () => {
      let answer = ""
      const audioChunks: Uint8Array[] = []
      try {
        const res = await fetch(`${BACKEND_URL}/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ session_id: sessionIdRef.current, message: text }),
        })
        if (!res.ok || !res.body) throw new Error(`backend ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split("\n\n")
          buffer = blocks.pop() ?? ""
          for (const block of blocks) {
            const parsed = parseSseBlock(block)
            if (!parsed) continue
            const data = parsed.data as Record<string, unknown>

            if (parsed.event === "delta") {
              answer += String(data.content ?? "")
              patch({ text: answer, pending: false })
            } else if (parsed.event === "final") {
              const rawSources = Array.isArray(data.sources) ? (data.sources as Record<string, unknown>[]) : []
              const sources: Source[] = rawSources.map((s) => ({
                title: String(s.title ?? "출처"),
                ref: String(s.url ?? s.excerpt ?? ""),
              }))
              patch({ text: answer || String(data.answer ?? ""), sources, pending: false })
            } else if (parsed.event === "audio") {
              const b64 = String(data.audio_base64 ?? "")
              const bin = atob(b64)
              const bytes = new Uint8Array(bin.length)
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
              audioChunks.push(bytes)
            } else if (parsed.event === "audio_done" && audioChunks.length > 0) {
              const blob = new Blob(audioChunks as BlobPart[], { type: "audio/mpeg" })
              void new Audio(URL.createObjectURL(blob)).play().catch(() => {})
            } else if (parsed.event === "error") {
              throw new Error(String(data.message ?? "stream error"))
            }
          }
        }
        if (!answer) patch({ text: "답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.", pending: false })
      } catch (err) {
        patch({
          text: `서버에 연결하지 못했어요. (${err instanceof Error ? err.message : "오류"})`,
          pending: false,
        })
      }
    })()
  }, [])

  // Prefill from ?q= and auto-send once
  useEffect(() => {
    if (startedRef.current) return
    const q = searchParams.get("q")
    if (!q) return

    const timeoutId = window.setTimeout(() => {
      if (startedRef.current) return
      startedRef.current = true
      send(q)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [searchParams, send])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(input)
  }

  const empty = messages.length === 0

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col px-4 sm:px-6">
      <div className="flex-1 overflow-hidden rounded-[40px] bg-white">
        {/* messages */}
        <div ref={scrollRef} className="flex h-full flex-col gap-6 overflow-y-auto bg-[#faf6f1] p-6">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 rounded-[40px] border border-[#ffb199] bg-[#fff3e7] px-6 py-10 text-center">
              <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#ffb199] ring-4 ring-[#ff764c]/30">
                <Image src="/images/mascot.png" alt="로디" width={96} height={96} className="size-full object-cover" />
              </span>
              <div className="w-full max-w-3xl space-y-3 text-center">
                <h1 className="font-heading text-3xl font-medium tracking-[-0.03em] text-[#1a1919] sm:text-4xl">
                  무엇을 도와드릴까요?
                </h1>
                <div className="mx-auto w-full max-w-xl space-y-1">
                  <p className="text-base leading-7 text-[#52545a]">
                    기초연금·노인복지·고용 등 궁금한 점을 편하게 물어보세요.
                  </p>
                  <p className="text-sm leading-7 text-[#76716f]">
                    나이와 사는 곳을 입력하면 로디가 더 정확하게 답해드릴게요.
                  </p>
                </div>
              </div>
              <div className="grid w-full max-w-lg grid-cols-2 gap-4 px-2 text-left sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-[40px] border border-[#dfddd8] bg-white px-4 py-2 text-sm text-[#1a1919] shadow-sm">
                  <span className="whitespace-nowrap text-sm font-medium text-[#9a3f16]">출생 연도</span>
                  <input
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    inputMode="numeric"
                    placeholder="예: 1958년"
                    className="h-10 w-full min-w-0 border-0 bg-transparent text-sm font-medium text-[#1a1919] outline-none placeholder:text-[#898c94]"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-[40px] border border-[#dfddd8] bg-white px-4 py-2 text-sm text-[#1a1919] shadow-sm">
                  <span className="whitespace-nowrap text-sm font-medium text-[#9a3f16]">사는 곳</span>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 서울 강남구"
                    className="h-10 w-full min-w-0 border-0 bg-transparent text-sm font-medium text-[#1a1919] outline-none placeholder:text-[#898c94]"
                  />
                </label>
              </div>
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestedQuestions.map((q, index) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className={cn(
                      "w-full rounded-full border border-[#dfddd8] bg-white px-8 py-3 text-sm font-medium text-[#312e2e] transition hover:border-[#ff3c00] hover:text-[#0e0e0f] whitespace-nowrap text-center",
                      index === suggestedQuestions.length - 1 ? "sm:col-span-2 sm:justify-self-center sm:w-auto" : "",
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-[40px] rounded-br-[14px] bg-[#ff3c00] px-5 py-4 text-sm leading-7 text-white">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex items-start gap-4">
                    <MascotAvatar className="h-12 w-12 shrink-0" />
                    <div className="max-w-[80%] space-y-3">
                      <div className="rounded-[40px] rounded-tl-[14px] border border-[#dfddd8] bg-white px-5 py-4 text-sm leading-7 text-[#1a1919]">
                        {m.pending ? (
                          <span className="flex items-center gap-2 py-1 text-[#76716f]">
                            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#ff3c00] [animation-delay:-0.3s]" />
                            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#ff3c00] [animation-delay:-0.15s]" />
                            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#ff3c00]" />
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap leading-7">{m.text}</p>
                        )}
                      </div>
                      {m.sources && m.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {m.sources.map((s) => (
                            <span
                              key={s.title}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#ff764c] px-3 py-1 text-xs font-medium text-white"
                            >
                              <BookText className="size-3.5" />
                              <span>{s.title}</span>
                              <span className="text-white/75">· {s.ref}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      {/* input */}
      <form onSubmit={handleSubmit} className="sticky bottom-0 z-10 pb-4 pt-4">
        <div className="flex items-center gap-3 rounded-full border border-[#dfddd8] bg-white p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="기초연금, 노인복지, 고용 등 궁금한 점을 입력하세요..."
            rows={1}
            className="min-h-[56px] w-full resize-none border-0 bg-transparent text-sm leading-6 text-[#1a1919] placeholder:text-[#898c94] shadow-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
            className="h-12 w-12 rounded-full bg-[#ff3c00] text-white hover:bg-[#ec4e02]"
          >
            <SendHorizonal className="size-5" />
            <span className="sr-only">전송</span>
          </Button>
        </div>
        <p className="mt-3 text-center text-xs leading-5 text-[#76716f]">
          <Sparkles className="inline-block size-3" /> 로디는 참고용 정보를 제공해요. 구체적 사안은 변호사 상담을 권장드려요.
        </p>
      </form>
    </div>
  )
}
