"use client"

import { Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AudioPlayerState } from "@/features/chat/hooks/use-chat-session"

type ChatAudioPlayerProps = {
  player: AudioPlayerState
  audioEnabled: boolean
  onAudioEnabledChange: (enabled: boolean) => void
  onPlay: () => void
  onPause: () => void
  onReplay: () => void
  onSeek: (time: number) => void
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
}

export function ChatAudioPlayer({
  player,
  audioEnabled,
  onAudioEnabledChange,
  onPlay,
  onPause,
  onReplay,
  onSeek,
}: ChatAudioPlayerProps) {
  if (player.status === "idle") return null

  const isLoading = player.status === "loading"
  const isPlaying = player.status === "playing"
  const hasAudio = !isLoading
  const duration = Math.max(player.duration, 0)
  const currentTime = Math.min(Math.max(player.currentTime, 0), duration || player.currentTime)
  const controlsDisabled = isLoading || !hasAudio || !audioEnabled

  return (
    <div className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-lg border border-[#dfddd8] bg-white px-3 py-2 text-[#1a1919] shadow-sm">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-pressed={audioEnabled}
        onClick={() => onAudioEnabledChange(!audioEnabled)}
        className="h-9 w-9 rounded-lg text-[#52545a] hover:bg-[#fff3e7] hover:text-[#1a1919]"
        aria-label={audioEnabled ? "답변 음성 끄기" : "답변 음성 켜기"}
        title={audioEnabled ? "답변 음성 끄기" : "답변 음성 켜기"}
      >
        {audioEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={controlsDisabled}
        onClick={isPlaying ? onPause : onPlay}
        className="h-9 w-9 rounded-lg text-[#ff3c00] hover:bg-[#fff3e7] hover:text-[#ec4e02]"
        aria-label={isPlaying ? "음성 일시정지" : "음성 재생"}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-3 text-xs leading-5 text-[#76716f]">
          <span className="font-medium text-[#52545a]">음성 답변</span>
          <span className="shrink-0 tabular-nums">
            {isLoading
              ? "준비 중"
              : hasAudio
                ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                : audioEnabled
                  ? "켜짐"
                  : "꺼짐"}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={duration ? currentTime : 0}
          disabled={controlsDisabled || !duration}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          className="h-2 w-full accent-[#ff3c00] disabled:opacity-40"
          aria-label="음성 재생 위치"
        />
      </div>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={controlsDisabled}
        onClick={onReplay}
        className="h-9 w-9 rounded-lg text-[#52545a] hover:bg-[#fff3e7] hover:text-[#1a1919]"
        aria-label="음성 처음부터 재생"
      >
        <RotateCcw className="size-4" />
      </Button>
    </div>
  )
}
