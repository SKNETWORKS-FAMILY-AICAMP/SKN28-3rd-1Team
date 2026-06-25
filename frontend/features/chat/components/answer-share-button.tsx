"use client"

import { Check, Copy, FileUp, QrCode, Share2 } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"
import { QRCodeSVG } from "qrcode.react"

import { Button } from "@/components/ui/button"
import { createAnswerShareUrl, formatAnswerShareText } from "@/features/chat/share-answer"
import type { ChatSource } from "@/features/chat/types"

type AnswerShareButtonProps = {
  answer: string
  sources?: ChatSource[]
}

type ShareState = "idle" | "shared" | "copied" | "saved" | "error"

function subscribeNoop() {
  return () => {}
}

function getOriginSnapshot() {
  return typeof window === "undefined" ? "" : window.location.origin
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

function downloadTextFile(text: string) {
  const file = new File([text], "lody-answer.txt", { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(file)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = file.name
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function AnswerShareButton({ answer, sources }: AnswerShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [shareState, setShareState] = useState<ShareState>("idle")
  const origin = useSyncExternalStore(subscribeNoop, getOriginSnapshot, () => "")
  const shareText = formatAnswerShareText(answer, sources)
  const disabled = shareText.length === 0
  const expanded = open && !disabled
  const shareUrl = origin && !disabled ? createAnswerShareUrl(origin, { answer: answer.trim(), sources }) : ""

  useEffect(() => {
    if (shareState === "idle") return

    const timeout = window.setTimeout(() => {
      setShareState("idle")
    }, 1800)

    return () => window.clearTimeout(timeout)
  }, [shareState])

  async function handleNativeShare() {
    if (!shareUrl) return

    const shareData: ShareData = {
      title: "로디 상담 답변",
      url: shareUrl,
    }

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData)
        setShareState("shared")
        return
      }

      await copyText(shareUrl)
      setShareState("copied")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return

      try {
        await copyText(shareUrl)
        setShareState("copied")
      } catch {
        setShareState("error")
      }
    }
  }

  async function handleCopyText() {
    if (disabled) return

    try {
      await copyText(shareText)
      setShareState("copied")
    } catch {
      setShareState("error")
    }
  }

  async function handleFileShare() {
    if (disabled) return

    const file = new File([shareText], "lody-answer.txt", { type: "text/plain;charset=utf-8" })
    const shareData: ShareData = {
      title: "로디 상담 답변",
      text: "로디 상담 답변 파일",
      files: [file],
    }

    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData)
        setShareState("shared")
        return
      }

      downloadTextFile(shareText)
      setShareState("saved")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return

      try {
        downloadTextFile(shareText)
        setShareState("saved")
      } catch {
        setShareState("error")
      }
    }
  }

  const feedbackLabel =
    shareState === "shared"
      ? "공유됨"
      : shareState === "copied"
        ? "복사됨"
        : shareState === "saved"
          ? "파일 저장됨"
          : shareState === "error"
            ? "처리 실패"
            : null

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-[#ead9c6] bg-white text-[#6c6359] hover:border-[#f0b88e] hover:bg-[#fff8f3] hover:text-[#1a1919]"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        title="답변 공유 QR 열기"
        aria-label="답변 공유 QR 열기"
        aria-expanded={expanded}
      >
        <QrCode data-icon="inline-start" />
        답변 공유
      </Button>

      {expanded ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-[232px] rounded-[14px] border border-[#ead9c6] bg-white p-3 shadow-[0_12px_30px_rgba(67,52,36,.16)]">
          <div className="flex flex-col items-center gap-3">
            {shareUrl ? (
              <div className="rounded-[12px] border border-[#f1e5d8] bg-white p-2">
                <QRCodeSVG value={shareUrl} size={148} level="L" includeMargin title="답변 공유 QR 코드" />
              </div>
            ) : (
              <div className="flex size-[164px] items-center justify-center rounded-[12px] border border-[#f1e5d8] bg-[#fbf6ef] text-center text-xs font-semibold leading-5 text-[#8a7c69]">
                답변 생성 후 QR을 만들 수 있어요.
              </div>
            )}

            <div className="flex w-full flex-col gap-2">
              <Button type="button" size="sm" className="w-full bg-[#ef8b54] text-white" disabled={!shareUrl} onClick={handleNativeShare}>
                <Share2 data-icon="inline-start" />
                링크 공유
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full border-[#ead9c6] text-[#6c6359]"
                disabled={disabled}
                onClick={handleCopyText}
              >
                {shareState === "copied" ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                답변 복사
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full border-[#ead9c6] text-[#6c6359]"
                disabled={disabled}
                onClick={handleFileShare}
              >
                <FileUp data-icon="inline-start" />
                답변 파일 보내기
              </Button>
            </div>

            <div className="h-4 text-[11px] font-semibold text-[#8a7c69]">{feedbackLabel}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
