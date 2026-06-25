import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { FormEvent } from "react";

import type { DictationStatus } from "@/page/chat/hooks/use-browser-speech-dictation";
import { Button } from "@/ui/primitives/button";
import { VoiceInputButton } from "@/ui/components/chat/voice-input-button";

type ChatComposerProps = {
  input: string;
  isBusy: boolean;
  error?: Error;
  dictationShortcut: {
    ariaKeyShortcuts: string;
    label: string;
  };
  dictationStatus: DictationStatus;
  dictationError?: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onVoiceClick: () => void;
};

export function ChatComposer({
  input,
  isBusy,
  error,
  dictationShortcut,
  dictationStatus,
  dictationError,
  onInputChange,
  onSubmit,
  onVoiceClick,
}: ChatComposerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="p-4 pt-0" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 rounded-[14px] border border-[var(--chat-border-strong)] bg-[var(--chat-panel)] py-2.5 pl-4 pr-2">
        <input
          id="chat-composer-input"
          name="message"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          disabled={isBusy}
          placeholder="메시지를 입력하세요..."
          className="chat-composer-input min-w-0 flex-1 bg-transparent text-sm text-[var(--chat-text)] outline-none placeholder:text-[var(--chat-text-soft)]"
        />
        <VoiceInputButton
          ariaKeyShortcuts={dictationShortcut.ariaKeyShortcuts}
          shortcutLabel={dictationShortcut.label}
          status={dictationStatus}
          onClick={isBusy ? undefined : onVoiceClick}
        />
        <Button
          type="submit"
          disabled={isBusy || !input.trim()}
          size="icon-lg"
          className="size-10 shrink-0 rounded-[11px] bg-[var(--chat-primary)] text-white shadow-[var(--chat-shadow-primary)] disabled:opacity-50"
          aria-label="전송"
        >
          <PaperAirplaneIcon className="size-4" />
        </Button>
      </div>
      <div className="mt-2 min-h-4 px-1 text-xs font-semibold">
        {dictationStatus === "listening" ? (
          <span className="text-[var(--chat-primary)]">듣는 중...</span>
        ) : dictationStatus === "requesting-permission" ? (
          <span className="text-[var(--chat-text-muted)]">마이크 확인 중...</span>
        ) : dictationStatus === "loading-model" ? (
          <span className="text-[var(--chat-text-muted)]">음성 인식 준비 중...</span>
        ) : dictationStatus === "transcribing" ? (
          <span className="text-[var(--chat-text-muted)]">음성 입력 정리 중...</span>
        ) : dictationError ? (
          <span className="text-[var(--destructive)]">{dictationError}</span>
        ) : error ? (
          <span className="text-[var(--destructive)]">{error.message}</span>
        ) : null}
      </div>
    </form>
  );
}
