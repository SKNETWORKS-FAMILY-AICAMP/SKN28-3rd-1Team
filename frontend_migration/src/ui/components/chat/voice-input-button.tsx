"use client";

import {
  ArrowPathIcon,
  MicrophoneIcon,
  StopIcon,
} from "@heroicons/react/24/outline";

import type { DictationStatus } from "@/page/chat/hooks/use-browser-speech-dictation";
import { Button } from "@/ui/primitives/button";
import { cn } from "@/lib/utils";

type VoiceInputButtonProps = {
  status: DictationStatus;
  onClick?: () => void;
  ariaKeyShortcuts?: string;
  shortcutLabel?: string;
  className?: string;
};

export function VoiceInputButton({
  status,
  onClick,
  ariaKeyShortcuts,
  shortcutLabel,
  className,
}: VoiceInputButtonProps) {
  const buttonState = getVoiceInputButtonState(status);
  const active = buttonState.tone === "active";
  const busy = buttonState.tone === "busy";
  const disabled = !onClick || status === "unsupported" || busy;
  const title = shortcutLabel
    ? `${buttonState.ariaLabel} (${shortcutLabel})`
    : buttonState.ariaLabel;

  return (
    <Button
      aria-label={buttonState.ariaLabel}
      aria-keyshortcuts={ariaKeyShortcuts}
      aria-pressed={active}
      className={cn(
        "size-10 shrink-0 rounded-[11px] border",
        active &&
          "border-[var(--chat-primary)] bg-[var(--chat-surface-strong)] text-[var(--chat-primary)] shadow-[var(--chat-shadow-soft)]",
        busy &&
          "border-[var(--chat-border-strong)] bg-[var(--chat-panel)] text-[var(--chat-text-muted)]",
        !active &&
          !busy &&
          "border-[var(--chat-border-strong)] bg-[var(--chat-panel)] text-[var(--chat-text-muted)] hover:border-[var(--chat-primary-border)] hover:text-[var(--chat-primary)]",
        className
      )}
      disabled={disabled}
      onClick={onClick}
      size="icon-lg"
      title={title}
      type="button"
      variant={active || busy ? "outline" : "ghost"}
    >
      {active ? (
        <StopIcon className="size-3.5" />
      ) : busy ? (
        <ArrowPathIcon className="size-4 animate-spin" />
      ) : (
        <MicrophoneIcon className="size-4" />
      )}
    </Button>
  );
}

function getVoiceInputButtonState(status: DictationStatus) {
  switch (status) {
    case "listening":
      return {
        ariaLabel: "녹음 중지",
        tone: "active" as const,
      };
    case "requesting-permission":
      return {
        ariaLabel: "마이크 권한 확인 중",
        tone: "busy" as const,
      };
    case "loading-model":
      return {
        ariaLabel: "음성 인식 모델 준비 중",
        tone: "busy" as const,
      };
    case "transcribing":
      return {
        ariaLabel: "음성 입력 정리 중",
        tone: "busy" as const,
      };
    case "unsupported":
      return {
        ariaLabel: "음성 입력을 사용할 수 없음",
        tone: "idle" as const,
      };
    case "error":
      return {
        ariaLabel: "음성 입력 다시 시도",
        tone: "idle" as const,
      };
    case "ready":
    case "idle":
    default:
      return {
        ariaLabel: "음성 입력 시작",
        tone: "idle" as const,
      };
  }
}
