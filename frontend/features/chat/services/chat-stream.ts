import "server-only"

import type { UIMessage, UIMessageChunk } from "ai"

import type { ChatMessageData, ChatMessageMetadata, ChatSource } from "@/features/chat/types"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000"
const TEXT_PART_ID = "answer"
const CONNECT_ERROR_MESSAGE = "서버에 연결하지 못했어요."

type LegalChatMessageChunk = UIMessageChunk<ChatMessageMetadata, ChatMessageData>

type ParsedSseBlock = {
  event: string
  data: Record<string, unknown>
}

type BackendChatStreamOptions = {
  sessionId?: string
  message: string
  audioEnabled: boolean
  signal?: AbortSignal
}

function parseSseBlock(block: string): ParsedSseBlock | null {
  let event = "message"
  const dataLines: string[] = []

  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim())
  }

  if (dataLines.length === 0) return null

  try {
    const data = JSON.parse(dataLines.join("\n"))
    if (!data || typeof data !== "object") return null
    return { event, data: data as Record<string, unknown> }
  } catch {
    return null
  }
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim()
}

export function getLatestUserText(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message.role === "user") return getMessageText(message)
  }

  return ""
}

function toChatSources(rawSources: unknown): ChatSource[] {
  if (!Array.isArray(rawSources)) return []

  return rawSources.map((source) => {
    const item = source && typeof source === "object" ? (source as Record<string, unknown>) : {}

    return {
      title: String(item.title ?? "출처"),
      ref: String(item.url ?? item.excerpt ?? ""),
    }
  })
}

function toErrorText(error: unknown) {
  if (error instanceof Error) return error.message
  return "오류"
}

function createAssistantTextStream(text: string, finishReason: "stop" | "error" = "stop") {
  return new ReadableStream<LegalChatMessageChunk>({
    start(controller) {
      controller.enqueue({ type: "start" })
      controller.enqueue({ type: "text-start", id: TEXT_PART_ID })
      controller.enqueue({ type: "text-delta", id: TEXT_PART_ID, delta: text })
      controller.enqueue({ type: "text-end", id: TEXT_PART_ID })
      controller.enqueue({ type: "finish", finishReason })
      controller.close()
    },
  })
}

function createAbortStream() {
  return new ReadableStream<LegalChatMessageChunk>({
    start(controller) {
      controller.enqueue({ type: "abort", reason: "cancelled" })
      controller.close()
    },
  })
}

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
}

function getToolCallPayload(data: Record<string, unknown>) {
  const toolCall = data.tool_call && typeof data.tool_call === "object" ? (data.tool_call as Record<string, unknown>) : data

  return {
    id: typeof toolCall.id === "string" ? toolCall.id : null,
    name: typeof toolCall.name === "string" ? toolCall.name : null,
    status: typeof toolCall.status === "string" ? toolCall.status : null,
  }
}

function createBackendUiMessageStream(responseBody: ReadableStream<Uint8Array>) {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

  return new ReadableStream<LegalChatMessageChunk>({
    async start(controller) {
      reader = responseBody.getReader()
      const decoder = new TextDecoder()
      const sources: ChatSource[] = []
      let buffer = ""
      let textStarted = false
      let hasText = false
      let finalAnswer = ""
      let finishReason: "stop" | "error" = "stop"
      let shouldStop = false

      const startText = () => {
        if (textStarted) return
        controller.enqueue({ type: "text-start", id: TEXT_PART_ID })
        textStarted = true
      }

      const emitText = (text: string) => {
        if (!text) return
        startText()
        hasText = true
        controller.enqueue({ type: "text-delta", id: TEXT_PART_ID, delta: text })
      }

      const finishText = () => {
        if (!textStarted) return
        controller.enqueue({ type: "text-end", id: TEXT_PART_ID })
        textStarted = false
      }

      const handleParsedBlock = (parsed: ParsedSseBlock) => {
        const { event, data } = parsed

        if (event === "delta") {
          emitText(String(data.content ?? ""))
          return
        }

        if (event === "tool_call") {
          controller.enqueue({
            type: "data-toolCall",
            data: getToolCallPayload(data),
            transient: true,
          })
          return
        }

        if (event === "final") {
          finalAnswer = String(data.answer ?? "")
          sources.splice(0, sources.length, ...toChatSources(data.sources))
          return
        }

        if (event === "speech_text") {
          controller.enqueue({
            type: "data-speechText",
            data: { text: String(data.text ?? "") },
            transient: true,
          })
          return
        }

        if (event === "audio") {
          const audioBase64 = String(data.audio_base64 ?? "")
          if (audioBase64) {
            controller.enqueue({
              type: "data-audio",
              data: { audioBase64 },
              transient: true,
            })
          }
          return
        }

        if (event === "audio_done") {
          controller.enqueue({
            type: "data-audioDone",
            data: { chunks: Number(data.chunks ?? 0) },
            transient: true,
          })
          return
        }

        if (event === "error") {
          emitText(`서버 오류가 발생했어요. (${String(data.message ?? "stream error")})`)
          finishReason = "error"
          shouldStop = true
        }
      }

      const processBuffer = () => {
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() ?? ""

        for (const block of blocks) {
          const parsed = parseSseBlock(block)
          if (parsed) handleParsedBlock(parsed)
          if (shouldStop) break
        }
      }

      try {
        controller.enqueue({ type: "start" })

        for (;;) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          processBuffer()

          if (shouldStop) {
            await reader.cancel()
            break
          }
        }

        buffer += decoder.decode()
        const remainingBlock = buffer.trim()
        if (!shouldStop && remainingBlock) {
          const parsed = parseSseBlock(remainingBlock)
          if (parsed) handleParsedBlock(parsed)
        }

        if (!hasText && finalAnswer) emitText(finalAnswer)

        finishText()

        for (const source of sources) {
          if (isHttpUrl(source.ref)) {
            controller.enqueue({
              type: "source-url",
              sourceId: source.ref,
              title: source.title,
              url: source.ref,
            })
          }
        }

        if (sources.length > 0) {
          controller.enqueue({ type: "message-metadata", messageMetadata: { sources } })
        }

        controller.enqueue({
          type: "finish",
          finishReason,
          ...(sources.length > 0 ? { messageMetadata: { sources } } : {}),
        })
        controller.close()
      } catch (error) {
        if (textStarted) finishText()

        if (error instanceof DOMException && error.name === "AbortError") {
          controller.enqueue({ type: "abort", reason: "cancelled" })
        } else {
          controller.enqueue({ type: "text-start", id: TEXT_PART_ID })
          controller.enqueue({
            type: "text-delta",
            id: TEXT_PART_ID,
            delta: `${CONNECT_ERROR_MESSAGE} (${toErrorText(error)})`,
          })
          controller.enqueue({ type: "text-end", id: TEXT_PART_ID })
          controller.enqueue({ type: "finish", finishReason: "error" })
        }

        controller.close()
      }
    },
    cancel(reason) {
      return reader?.cancel(reason) ?? responseBody.cancel(reason)
    },
  })
}

export async function createBackendChatStream({ sessionId, message, audioEnabled, signal }: BackendChatStreamOptions) {
  if (!message) {
    return createAssistantTextStream("질문 내용을 찾지 못했어요. 다시 입력해 주세요.", "error")
  }

  try {
    const response = await fetch(`${BACKEND_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ session_id: sessionId, message, audio_enabled: audioEnabled }),
      signal,
    })

    if (!response.ok || !response.body) {
      return createAssistantTextStream(`${CONNECT_ERROR_MESSAGE} (backend ${response.status})`, "error")
    }

    return createBackendUiMessageStream(response.body)
  } catch (error) {
    if (signal?.aborted) return createAbortStream()
    return createAssistantTextStream(`${CONNECT_ERROR_MESSAGE} (${toErrorText(error)})`, "error")
  }
}
