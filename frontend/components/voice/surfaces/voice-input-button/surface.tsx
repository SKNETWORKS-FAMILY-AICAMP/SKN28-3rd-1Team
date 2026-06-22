"use client"

import { LoaderCircleIcon, MicIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { DictationStatus } from "@/components/voice/types"
import { cn } from "@/lib/utils"

type VoiceInputButtonProps = {
  status: DictationStatus
  onClick?: () => void
  compact?: boolean
  className?: string
}

export function VoiceInputButton({ status, onClick, compact = false, className }: VoiceInputButtonProps) {
  const buttonState = getVoiceInputButtonState(status)
  const active = buttonState.tone === "active"
  const busy = buttonState.tone === "busy"
  const disabled = !onClick || status === "unsupported" || busy

  if (compact) {
    return (
      <Button
        aria-label={buttonState.ariaLabel}
        aria-pressed={active}
        className={cn(
          "size-10 rounded-[11px] border",
          active && "border-[#ef8b54] bg-[#fff3ea] text-[#ef8b54] shadow-[0_2px_6px_rgba(239,139,84,.2)]",
          busy && "border-[#ead9c6] bg-white text-[#8d8175]",
          !active && !busy && "border-[#ead9c6] bg-white text-[#8d8175] hover:border-[#f0b88e] hover:text-[#ef8b54]",
          className,
        )}
        disabled={disabled}
        onClick={onClick}
        size="icon-lg"
        title={buttonState.ariaLabel}
        type="button"
        variant={active || busy ? "outline" : "ghost"}
      >
        {active ? <SquareIcon className="size-3.5" /> : busy ? <LoaderCircleIcon className="size-4 animate-spin" /> : <MicIcon className="size-4" />}
      </Button>
    )
  }

  return (
    <Button
      aria-label={buttonState.ariaLabel}
      aria-pressed={active}
      className={cn(
        "h-9 rounded-full px-3 text-sm transition-colors",
        active && "border-primary/20 bg-primary/10 text-primary shadow-sm ring-1 ring-primary/25 hover:bg-primary/15",
        busy && "bg-muted text-muted-foreground",
        !active && !busy && "text-muted-foreground",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant={active || busy ? "outline" : "ghost"}
    >
      {active ? (
        <span className="size-2 rounded-full bg-primary shadow-[0_0_0_4px_var(--primary-glow)] motion-safe:animate-pulse" />
      ) : busy ? (
        <LoaderCircleIcon className="motion-safe:animate-spin" />
      ) : (
        <MicIcon />
      )}
      <span>{buttonState.label}</span>
      {active ? <SquareIcon className="size-3" /> : null}
    </Button>
  )
}

function getVoiceInputButtonState(status: DictationStatus) {
  switch (status) {
    case "listening":
      return {
        ariaLabel: "녹음 중지",
        label: "듣는 중 · 중지",
        tone: "active" as const,
      }
    case "requesting-permission":
      return {
        ariaLabel: "마이크 권한 확인 중",
        label: "마이크 확인 중",
        tone: "busy" as const,
      }
    case "loading-model":
      return {
        ariaLabel: "음성 인식 모델 준비 중",
        label: "준비 중",
        tone: "busy" as const,
      }
    case "transcribing":
      return {
        ariaLabel: "음성 입력 정리 중",
        label: "정리 중",
        tone: "busy" as const,
      }
    case "unsupported":
      return {
        ariaLabel: "음성 입력을 사용할 수 없음",
        label: "마이크 불가",
        tone: "idle" as const,
      }
    case "error":
      return {
        ariaLabel: "음성 입력 다시 시도",
        label: "다시 말하기",
        tone: "idle" as const,
      }
    case "ready":
    case "idle":
    default:
      return {
        ariaLabel: "음성 입력 시작",
        label: "말로 입력",
        tone: "idle" as const,
      }
  }
}
