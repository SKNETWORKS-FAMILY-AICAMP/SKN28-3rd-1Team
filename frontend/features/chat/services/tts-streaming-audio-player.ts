const AUDIO_MIME_TYPE = "audio/mpeg"
const DEBUG_STORAGE_KEY = "debug:tts"
const INITIAL_BUFFER_CHUNKS = 4
const INITIAL_BUFFER_BYTES = 16 * 1024

export type TtsPlaybackMode = "none" | "media-source" | "blob"
export type TtsPlaybackPhase = "idle" | "buffering" | "playing" | "blocked" | "completed" | "error"

export type TtsPlaybackStatus = {
  chunks: number
  error?: string
  mode: TtsPlaybackMode
  phase: TtsPlaybackPhase
  streamCompleted: boolean
}

type TtsPlaybackStatusListener = (status: TtsPlaybackStatus) => void
type TtsDebugDetails = Record<string, boolean | number | string | null | undefined>

export function createInitialTtsPlaybackStatus(): TtsPlaybackStatus {
  return {
    chunks: 0,
    mode: "none",
    phase: "idle",
    streamCompleted: false,
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error || "audio playback failed")
}

function getNowMs() {
  return typeof performance === "undefined" ? Date.now() : performance.now()
}

function roundMs(value: number) {
  return Math.round(value * 10) / 10
}

function isTtsDebugEnabled() {
  if (typeof window === "undefined") return false

  try {
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1" || new URLSearchParams(window.location.search).get("debug_tts") === "1"
  } catch {
    return false
  }
}

function canUseMediaSourcePlayback() {
  if (typeof window === "undefined" || typeof MediaSource === "undefined") return false
  return MediaSource.isTypeSupported(AUDIO_MIME_TYPE)
}

export class TtsStreamingAudioPlayer {
  private appendedBytes = 0
  private appendedChunks = 0
  private audio: HTMLAudioElement | null = null
  private chunks: Uint8Array[] = []
  private disposed = false
  private fallbackLogged = false
  private firstChunkAt: number | null = null
  private mediaSource: MediaSource | null = null
  private mode: TtsPlaybackMode = "none"
  private objectUrl: string | null = null
  private playbackBlocked = false
  private playbackStarted = false
  private playPending = false
  private queue: Uint8Array[] = []
  private receivedChunks = 0
  private readonly shouldUseMediaSource = canUseMediaSourcePlayback()
  private sourceBuffer: SourceBuffer | null = null
  private streamCompleted = false

  constructor(private readonly onStatus: TtsPlaybackStatusListener) {}

  append(chunk: Uint8Array) {
    if (this.disposed || chunk.byteLength === 0) return

    if (this.firstChunkAt === null) {
      this.firstChunkAt = getNowMs()
    }

    this.chunks.push(chunk)
    this.receivedChunks += 1
    this.logDebug("chunk.received", {
      bytes: chunk.byteLength,
      mediaSourceSupported: this.shouldUseMediaSource,
      selectedPath: this.shouldUseMediaSource ? "media-source" : "blob fallback",
    })

    if (!this.shouldUseMediaSource) {
      this.mode = "blob"
      this.logBlobFallbackOnce("media source unsupported")
      this.emitStatus("buffering")
      return
    }

    this.mode = "media-source"
    if (!this.ensureMediaSourcePlayback()) return

    this.queue.push(chunk)
    this.emitStatus(this.playbackStarted ? "playing" : "buffering")
    this.pumpQueue()
  }

  finalize() {
    if (this.disposed) return

    this.streamCompleted = true
    this.logDebug("stream.finalize", {
      receivedChunks: this.receivedChunks,
      playbackStarted: this.playbackStarted,
    })

    if (this.receivedChunks === 0) {
      this.completePlayback()
      return
    }

    if (this.mode === "blob") {
      this.playBlobFallback()
      return
    }

    this.maybeStartPlayback()
    this.finishMediaSource()
    this.emitStatus(this.playbackStarted ? "playing" : "buffering")
  }

  dispose(emitIdleStatus = true, reason = "dispose") {
    if (this.disposed) return

    this.logDebug("cleanup.dispose", { emitIdleStatus, reason })
    this.disposed = true
    this.queue = []
    this.chunks = []
    this.releasePlaybackResources()
    if (emitIdleStatus) this.onStatus(createInitialTtsPlaybackStatus())
  }

  private ensureMediaSourcePlayback() {
    if (this.mediaSource) return true

    try {
      this.mediaSource = new MediaSource()
      this.mediaSource.addEventListener("sourceopen", this.handleSourceOpen)
      this.audio = new Audio()
      this.audio.preload = "auto"
      this.audio.addEventListener("ended", this.handleAudioEnded)
      this.audio.addEventListener("error", this.handleAudioError)
      this.objectUrl = URL.createObjectURL(this.mediaSource)
      this.audio.src = this.objectUrl
      this.logDebug("media-source.create", { mimeType: AUDIO_MIME_TYPE })
      return true
    } catch (error) {
      this.switchToBlobFallback(error)
      return false
    }
  }

  private handleSourceOpen = () => {
    if (this.disposed || !this.mediaSource || this.mediaSource.readyState !== "open") return
    if (this.sourceBuffer) return

    this.logDebug("media-source.open")

    try {
      this.sourceBuffer = this.mediaSource.addSourceBuffer(AUDIO_MIME_TYPE)
      try {
        this.sourceBuffer.mode = "sequence"
      } catch {
        // Some browsers expose SourceBuffer but do not allow sequence mode for MP3.
      }
      this.sourceBuffer.addEventListener("updateend", this.handleSourceBufferUpdateEnd)
      this.sourceBuffer.addEventListener("error", this.handleSourceBufferError)
      this.logDebug("source-buffer.create", { mimeType: AUDIO_MIME_TYPE })
      this.pumpQueue()
    } catch (error) {
      this.switchToBlobFallback(error)
    }
  }

  private handleSourceBufferUpdateEnd = () => {
    if (this.disposed) return

    this.logDebug("source-buffer.append.done")
    this.maybeStartPlayback()
    this.pumpQueue()
    this.finishMediaSource()
  }

  private handleSourceBufferError = () => {
    this.logDebug("source-buffer.error")
    this.switchToBlobFallback(new Error("source buffer append failed"))
  }

  private handleAudioEnded = () => {
    this.logDebug("audio.ended")
    this.completePlayback()
  }

  private handleAudioError = () => {
    const message = this.audio?.error?.message || "audio playback failed"
    this.logDebug("audio.error", { message })

    if (this.mode === "media-source" && !this.playbackStarted) {
      this.switchToBlobFallback(new Error(message))
      return
    }

    this.emitStatus("error", message)
    this.disposed = true
    this.releasePlaybackResources()
  }

  private pumpQueue() {
    if (this.disposed || !this.sourceBuffer || this.sourceBuffer.updating || this.queue.length === 0) return

    const chunk = this.queue.shift()
    if (!chunk) return

    try {
      this.logDebug("source-buffer.append.start", {
        bytes: chunk.byteLength,
        queuedChunksBeforeAppend: this.queue.length,
      })
      this.sourceBuffer.appendBuffer(chunk)
      this.appendedBytes += chunk.byteLength
      this.appendedChunks += 1
    } catch (error) {
      this.queue.unshift(chunk)
      this.switchToBlobFallback(error)
    }
  }

  private maybeStartPlayback() {
    if (this.playbackStarted || this.playbackBlocked || this.playPending || !this.audio) return
    if (!this.streamCompleted && !this.hasInitialBuffer()) return

    void this.startPlayback()
  }

  private async startPlayback() {
    const audio = this.audio
    if (!audio || this.disposed) return

    this.logDebug("play.request", {
      startedBeforeStreamCompleted: !this.streamCompleted,
    })
    this.playPending = true
    try {
      await audio.play()
      if (this.disposed) return
      this.playbackStarted = true
      this.logDebug("play.started", {
        startedBeforeStreamCompleted: !this.streamCompleted,
      })
      this.emitStatus("playing")
    } catch (error) {
      if (this.disposed) return
      this.playbackBlocked = true
      this.logDebug("play.blocked", {
        message: getErrorMessage(error),
      })
      this.emitStatus("blocked", getErrorMessage(error))
    } finally {
      this.playPending = false
    }
  }

  private hasInitialBuffer() {
    return this.appendedChunks >= INITIAL_BUFFER_CHUNKS || this.appendedBytes >= INITIAL_BUFFER_BYTES
  }

  private finishMediaSource() {
    if (
      this.disposed ||
      !this.streamCompleted ||
      !this.mediaSource ||
      this.mediaSource.readyState !== "open" ||
      !this.sourceBuffer ||
      this.sourceBuffer.updating ||
      this.queue.length > 0
    ) {
      return
    }

    try {
      this.logDebug("media-source.end")
      this.mediaSource.endOfStream()
    } catch (error) {
      this.emitStatus("error", getErrorMessage(error))
    }
  }

  private switchToBlobFallback(error: unknown) {
    this.logBlobFallbackOnce(getErrorMessage(error))
    this.mode = "blob"
    this.queue = []
    this.appendedBytes = 0
    this.appendedChunks = 0
    this.playbackStarted = false
    this.playbackBlocked = false
    this.playPending = false
    this.releasePlaybackResources()

    if (this.streamCompleted) {
      this.playBlobFallback()
      return
    }

    this.emitStatus("buffering", getErrorMessage(error))
  }

  private playBlobFallback() {
    if (this.disposed) return

    this.mode = "blob"
    this.releasePlaybackResources()

    if (this.chunks.length === 0) {
      this.completePlayback()
      return
    }

    const blob = new Blob(this.chunks as BlobPart[], { type: AUDIO_MIME_TYPE })
    this.objectUrl = URL.createObjectURL(blob)
    this.audio = new Audio(this.objectUrl)
    this.audio.preload = "auto"
    this.audio.addEventListener("ended", this.handleAudioEnded)
    this.audio.addEventListener("error", this.handleAudioError)
    this.logDebug("blob.create", { bytes: blob.size })
    this.emitStatus("buffering")
    this.maybeStartPlayback()
  }

  private completePlayback() {
    if (this.disposed) return

    this.streamCompleted = true
    this.logDebug("playback.complete")
    this.emitStatus("completed")
    this.disposed = true
    this.queue = []
    this.chunks = []
    this.releasePlaybackResources()
  }

  private releasePlaybackResources() {
    if (this.mediaSource) {
      this.mediaSource.removeEventListener("sourceopen", this.handleSourceOpen)
    }

    if (this.sourceBuffer) {
      this.sourceBuffer.removeEventListener("updateend", this.handleSourceBufferUpdateEnd)
      this.sourceBuffer.removeEventListener("error", this.handleSourceBufferError)
    }

    if (this.audio) {
      this.audio.removeEventListener("ended", this.handleAudioEnded)
      this.audio.removeEventListener("error", this.handleAudioError)
      this.audio.pause()
      this.audio.removeAttribute("src")
      this.audio.load()
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
    }

    this.audio = null
    this.mediaSource = null
    this.objectUrl = null
    this.sourceBuffer = null
  }

  private emitStatus(phase: TtsPlaybackPhase, error?: string) {
    this.onStatus({
      chunks: this.receivedChunks,
      ...(error ? { error } : {}),
      mode: this.mode,
      phase,
      streamCompleted: this.streamCompleted,
    })
  }

  private logBlobFallbackOnce(reason: string) {
    if (this.fallbackLogged) return
    this.fallbackLogged = true
    this.logDebug("fallback.blob", { reason })
  }

  private logDebug(event: string, details: TtsDebugDetails = {}) {
    if (!isTtsDebugEnabled()) return

    const now = getNowMs()
    const msSinceFirstChunk = this.firstChunkAt === null ? null : roundMs(now - this.firstChunkAt)

    console.debug(`[tts:${event}]`, {
      ...details,
      appendedBytes: this.appendedBytes,
      appendedChunks: this.appendedChunks,
      chunks: this.receivedChunks,
      mode: this.mode,
      msSinceFirstChunk,
      queuedChunks: this.queue.length,
      streamCompleted: this.streamCompleted,
      t: roundMs(now),
    })
  }
}
