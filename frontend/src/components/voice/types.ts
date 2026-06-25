export type DictationStatus =
  | "idle"
  | "requesting-permission"
  | "loading-model"
  | "listening"
  | "transcribing"
  | "ready"
  | "error"
  | "unsupported"

export type DictationTranscript = {
  text: string
  language?: string
  durationSeconds?: number
  isFinal?: boolean
}

export type DictationModelState = {
  provider: "browser" | "elevenlabs" | "openrouter" | "webgpu"
  modelId: string
  device: "browser" | "server" | "webgpu"
  dtype?: "api" | "q4f16"
  fallbackModelId?: string
  progressPercent?: number
  progressLabel?: string
}
