"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getMockAnswer, suggestedQuestions, type Source } from "@/lib/mock-legal"
import { SendHorizonal, BookText, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  id: string
  role: "user" | "assistant"
  text: string
  sources?: Source[]
  pending?: boolean
}

function MascotAvatar({ className }: { className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-2 ring-primary/30", className)}>
      <Image src="/images/mascot.png" alt="로디" width={40} height={40} className="size-full object-cover" />
    </span>
  )
}

export function ChatInterface() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const send = (raw: string) => {
    const text = raw.trim()
    if (!text) return
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text }
    const pendingId = crypto.randomUUID()
    setMessages((prev) => [...prev, userMsg, { id: pendingId, role: "assistant", text: "", pending: true }])
    setInput("")

    setTimeout(() => {
      const answer = getMockAnswer(text)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, text: answer.text, sources: answer.sources, pending: false }
            : m,
        ),
      )
    }, 900)
  }

  // Prefill from ?q= and auto-send once
  useEffect(() => {
    if (startedRef.current) return
    const q = searchParams.get("q")
    if (q) {
      startedRef.current = true
      send(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <span className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-secondary ring-4 ring-card shadow-md">
              <Image src="/images/mascot.png" alt="로디" width={96} height={96} className="size-full object-cover" />
            </span>
            <div className="space-y-2">
              <h1 className="font-heading text-2xl text-foreground">무엇을 도와드릴까요?</h1>
              <p className="max-w-sm text-pretty text-muted-foreground">
                기초연금·노인복지·고용 등 궁금한 점을 편하게 물어보세요. 로디가 관련 법령과 공공 문서를 찾아 쉽게 설명해드려요.
              </p>
            </div>
            <div className="flex w-full max-w-lg flex-wrap justify-center gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent"
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
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-primary-foreground">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-3">
                  <MascotAvatar className="size-12 shrink-0" />
                  <div className="max-w-[80%] space-y-3">
                    <div className="rounded-3xl rounded-tl-md border border-border bg-card px-4 py-3 text-card-foreground shadow-sm">
                      {m.pending ? (
                        <span className="flex items-center gap-1.5 py-1 text-muted-foreground">
                          <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                          <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                          <span className="size-2 animate-bounce rounded-full bg-primary" />
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                      )}
                    </div>
                    {m.sources && m.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {m.sources.map((s) => (
                          <span
                            key={s.title}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
                          >
                            <BookText className="size-3.5" />
                            <span className="font-medium">{s.title}</span>
                            <span className="text-accent-foreground/70">· {s.ref}</span>
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

      {/* input */}
      <form onSubmit={handleSubmit} className="sticky bottom-0 pb-4 pt-2">
        <div className="flex items-end gap-2 rounded-3xl border border-border bg-card p-2 shadow-md focus-within:border-primary/50">
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
            className="min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} className="size-11 shrink-0 rounded-2xl">
            <SendHorizonal className="size-5" />
            <span className="sr-only">전송</span>
          </Button>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Sparkles className="size-3" />
          로디는 참고용 정보를 제공해요. 구체적 사안은 변호사 상담을 권장드려요.
        </p>
      </form>
    </div>
  )
}
