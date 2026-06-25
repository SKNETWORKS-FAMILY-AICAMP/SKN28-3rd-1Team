"use client"

import { ArrowLeft, Check, Copy } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { formatAnswerShareText, parseAnswerShareData } from "@/features/chat/share-answer"
import {
  formatMaterialsShareText,
  parseMaterialsShareData,
  type MaterialsSharePayload,
  type SharedDocument,
} from "@/features/chat/share-materials"

function getHashSnapshot() {
  if (typeof window === "undefined") return null

  return window.location.hash.replace(/^#/, "")
}

function getHashValue(hash: string | null, key: string) {
  if (hash === null) return null
  if (!hash) return ""

  const params = new URLSearchParams(hash)
  return params.get(key) ?? ""
}

function subscribeHashChange(callback: () => void) {
  window.addEventListener("hashchange", callback)
  return () => window.removeEventListener("hashchange", callback)
}

function isInstitutionPayload(
  payload: MaterialsSharePayload,
): payload is Extract<MaterialsSharePayload, { view: "institution-map" | "institution-list" }> {
  return payload.view === "institution-map" || payload.view === "institution-list"
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.top = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()

  try {
    document.execCommand("copy")
  } finally {
    document.body.removeChild(textarea)
  }
}

export function SharePageClient() {
  const [copied, setCopied] = useState(false)
  const hash = useSyncExternalStore(subscribeHashChange, getHashSnapshot, () => null)
  const answerPayload = parseAnswerShareData(getHashValue(hash, "data"))
  const materialsPayload = parseMaterialsShareData(getHashValue(hash, "materials"))
  const copyTextValue = materialsPayload
    ? formatMaterialsShareText(materialsPayload)
    : answerPayload
      ? formatAnswerShareText(answerPayload.answer, answerPayload.sources)
      : ""

  useEffect(() => {
    if (!copied) return

    const timeout = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [copied])

  async function handleCopy() {
    if (!copyTextValue) return
    await copyText(copyTextValue)
    setCopied(true)
  }

  return (
    <main className="min-h-dvh bg-[#ece7e0] px-4 py-6 text-[#3a342e] sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <header className="flex items-center justify-between gap-3 rounded-[14px] border border-[#ead9c6] bg-white px-4 py-3">
          <Link href="/chat_page" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6c6359]">
            <ArrowLeft className="size-4 text-[#ef8b54]" />
            로디로 돌아가기
          </Link>
          <Button type="button" size="sm" variant="outline" className="border-[#ead9c6] text-[#6c6359]" disabled={!copyTextValue} onClick={handleCopy}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? "복사됨" : materialsPayload ? "자료 복사" : "답변 복사"}
          </Button>
        </header>

        <section className="rounded-[18px] border border-[#ead9c6] bg-white p-5 shadow-[0_12px_30px_rgba(67,52,36,.08)]">
          {hash === null ? (
            <p className="text-sm font-semibold leading-7 text-[#7c736a]">공유 자료를 여는 중입니다.</p>
          ) : materialsPayload ? (
            <SharedMaterialsView payload={materialsPayload} />
          ) : answerPayload ? (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#9a8f82]">로디 상담 답변</p>
                <h1 className="mt-2 font-heading text-2xl text-[#33302b]">공유된 답변</h1>
              </div>

              <div className="whitespace-pre-wrap rounded-[14px] bg-[#fbf6ef] px-4 py-4 text-sm leading-7 text-[#403a33]">
                {answerPayload.answer}
              </div>

              {answerPayload.sources && answerPayload.sources.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-extrabold text-[#4a4038]">참고 자료</h2>
                  <div className="flex flex-wrap gap-2">
                    {answerPayload.sources.map((source, index) => (
                      <span
                        key={`${source.title}-${source.ref}-${index}`}
                        className="inline-flex rounded-full bg-[#fbe3d2] px-3 py-1 text-xs font-bold text-[#cf7838]"
                      >
                        {source.title}
                        {source.ref ? ` · ${source.ref}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <h1 className="font-heading text-2xl text-[#33302b]">공유 내용을 열 수 없어요</h1>
              <p className="text-sm font-medium leading-7 text-[#7c736a]">공유 정보가 없거나 QR 링크가 올바르지 않습니다.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function SharedMaterialsView({ payload }: { payload: MaterialsSharePayload }) {
  if (isInstitutionPayload(payload)) {
    const selected = payload.selectedInstitution

    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#9a8f82]">로디 상담 자료</p>
          <h1 className="mt-2 font-heading text-2xl text-[#33302b]">{payload.title}</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-[#7c736a]">{payload.description}</p>
        </div>

        <div className="rounded-[14px] bg-[#fbf6ef] px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#ef8b54] text-sm font-bold text-white">
              {payload.selectedInstitutionId + 1}
            </span>
            <h2 className="text-lg font-extrabold text-[#2f2b26]">{selected.name}</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selected.badges.map((badge) => (
              <span key={badge} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#8a7c69]">
                {badge}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 text-sm leading-6 text-[#574f46]">
            <p>전화: {selected.phone}</p>
            <p>주소: {selected.address}</p>
            <p>운영: {selected.hours}</p>
            <p>주요 사업: {selected.business}</p>
            <p>신청 방법: {selected.apply}</p>
            <p>준비 서류: {selected.docs}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-extrabold text-[#4a4038]">추천 기관 목록</h2>
          {payload.institutions.map((institution, index) => (
            <div key={institution.name} className="rounded-[13px] border border-[#efe7da] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#e8ddce] text-xs font-bold text-[#8a7c69]">
                  {index + 1}
                </span>
                <span className="font-bold text-[#332f29]">{institution.name}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#7c736a]">{institution.address}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (payload.view === "document-detail") {
    const document = payload.selectedDocument

    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#9a8f82]">로디 상담 자료</p>
          <h1 className="mt-2 font-heading text-2xl text-[#33302b]">{payload.title}</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-[#7c736a]">{payload.description}</p>
        </div>

        <div className="rounded-[14px] bg-[#fbf6ef] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold leading-snug text-[#2f2b26]">{document.title}</h2>
              <p className="mt-1 text-xs font-semibold text-[#9a8f82]">
                {document.source} · {document.page} · {document.updated}
              </p>
            </div>
            <span className="rounded-[8px] bg-[#d9efe0] px-2.5 py-1 text-xs font-extrabold text-[#3f9a63]">
              {document.match}%
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {document.tags.map((tag) => (
              <span key={tag} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#8a7c69]">
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-4 text-sm leading-7 text-[#574f46]">{document.summary}</p>

          <div className="mt-4 flex flex-col gap-2">
            <h3 className="text-sm font-extrabold text-[#4a4038]">확인 포인트</h3>
            {document.highlights.map((highlight) => (
              <p key={highlight} className="rounded-[10px] bg-white px-3 py-2 text-sm leading-6 text-[#574f46]">
                {highlight}
              </p>
            ))}
          </div>

          <p className="mt-4 rounded-[10px] border border-[#ead9c6] bg-white px-3 py-2 text-sm leading-6 text-[#574f46]">
            {document.citation}
          </p>
        </div>

        <DocumentList documents={payload.documents} selectedDocumentId={payload.selectedDocumentId} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#9a8f82]">로디 상담 자료</p>
        <h1 className="mt-2 font-heading text-2xl text-[#33302b]">{payload.title}</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#7c736a]">{payload.description}</p>
      </div>

      <DocumentList documents={payload.documents} selectedDocumentId={payload.selectedDocumentId} />
    </div>
  )
}

function DocumentList({ documents, selectedDocumentId }: { documents: SharedDocument[]; selectedDocumentId: number }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-[#4a4038]">문서 목록</h2>
      {documents.map((document, index) => (
        <div
          key={document.title}
          className="rounded-[13px] border border-[#efe7da] px-4 py-3 data-[selected=true]:border-[#f0b88e] data-[selected=true]:bg-[#fff8f3]"
          data-selected={index === selectedDocumentId}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-extrabold leading-snug text-[#332f29]">{document.title}</h3>
              <p className="mt-1 text-xs font-semibold text-[#9a8f82]">
                {document.source} · {document.page}
              </p>
            </div>
            <span className="rounded-[8px] bg-[#d9efe0] px-2.5 py-1 text-xs font-extrabold text-[#3f9a63]">
              {document.match}%
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#5f574d]">{document.summary}</p>
        </div>
      ))}
    </div>
  )
}
