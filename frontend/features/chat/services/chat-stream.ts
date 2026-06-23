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
  metadata?: Record<string, unknown>
  signal?: AbortSignal
}

function parseSseBlock(block: string): ParsedSseBlock | null {
  let event = "message"
  const dataLines: string[] = []

  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) {
      dataLines.push(line.startsWith("data: ") ? line.slice(6) : line.slice(5))
    }
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

function createTimestamp() {
  return new Date().toISOString()
}

function enqueueMessageTimestamp(controller: ReadableStreamDefaultController<LegalChatMessageChunk>) {
  controller.enqueue({
    type: "data-messageTimestamp",
    data: { timestamp: createTimestamp() },
  })
}

function createAssistantTextStream(text: string, finishReason: "stop" | "error" = "stop") {
  return new ReadableStream<LegalChatMessageChunk>({
    start(controller) {
      controller.enqueue({ type: "start" })
      enqueueMessageTimestamp(controller)
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

function getSourceAgent(data: Record<string, unknown>) {
  if (typeof data.source_agent === "string") return data.source_agent
  if (typeof data.node === "string") return data.node
  return null
}

function getToolCallPayload(data: Record<string, unknown>) {
  const toolCall =
    data.tool_call && typeof data.tool_call === "object" ? (data.tool_call as Record<string, unknown>) : data
  const timestamp = typeof data.timestamp === "string" ? data.timestamp : createTimestamp()

  return {
    event: "agent.tool_call.delta",
    id: typeof toolCall.id === "string" ? toolCall.id : null,
    name: typeof toolCall.name === "string" ? toolCall.name : null,
    status: typeof toolCall.status === "string" ? toolCall.status : null,
    sourceAgent: getSourceAgent(data),
    timestamp,
  }
}

function getEventText(data: Record<string, unknown>) {
  return String(data.text ?? data.content ?? "")
}

function isSpeechTextAgent(data: Record<string, unknown>) {
  const sourceAgent = getSourceAgent(data)
  return sourceAgent === "speech_text_agent" || data.agent === "speech_text_agent"
}

function enqueueAgentTrace(
  controller: ReadableStreamDefaultController<LegalChatMessageChunk>,
  event: string,
  data: Record<string, unknown>,
) {
  const timestamp = typeof data.timestamp === "string" ? data.timestamp : createTimestamp()

  controller.enqueue({
    type: "data-agentTrace",
    data: {
      type: event,
      sourceAgent: getSourceAgent(data),
      node: typeof data.node === "string" ? data.node : null,
      text: getEventText(data) || undefined,
      timestamp,
      toolCall:
        data.tool_call && typeof data.tool_call === "object" ? getToolCallPayload({ ...data, timestamp }) : undefined,
    },
  })
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
      let finishReason: "stop" | "error" = "stop"
      let shouldStop = false
      let audioChunkCount = 0
      let audioSourceAgent: string | null = null

      const interruptAudio = (reason: string) => {
        if (audioChunkCount === 0) return
        controller.enqueue({
          type: "data-audioStatus",
          id: "tts-audio",
          data: {
            chunks: audioChunkCount,
            completed: true,
            interrupted: true,
            reason,
            sourceAgent: audioSourceAgent,
          },
        })
        controller.enqueue({
          type: "data-audioInterrupted",
          data: { reason },
          transient: true,
        })
      }

      const startText = () => {
        if (textStarted) return
        controller.enqueue({ type: "text-start", id: TEXT_PART_ID })
        textStarted = true
      }

      const emitText = (text: string) => {
        if (!text) return
        startText()
        controller.enqueue({ type: "text-delta", id: TEXT_PART_ID, delta: text })
      }

      const finishText = () => {
        if (!textStarted) return
        controller.enqueue({ type: "text-end", id: TEXT_PART_ID })
        textStarted = false
      }

      const handleParsedBlock = (parsed: ParsedSseBlock) => {
        const { event, data } = parsed

        if (event === "agent.text.delta") {
          const text = getEventText(data)
          if (data.source_agent === "main_agent") emitText(text)
          else enqueueAgentTrace(controller, event, data)
          return
        }

        if (event === "delta") {
          emitText(String(data.content ?? ""))
          return
        }

        if (event === "agent.reasoning.delta") {
          if (isSpeechTextAgent(data)) enqueueAgentTrace(controller, event, data)
          return
        }

        if (event === "thinking_delta") {
          if (isSpeechTextAgent(data)) {
            enqueueAgentTrace(controller, "agent.reasoning.delta", {
              ...data,
              source_agent: data.agent,
              text: data.content,
            })
          }
          return
        }

        if (event === "speech_text.input") {
          enqueueAgentTrace(controller, event, data)
          return
        }

        if (event === "screen_control.input") {
          enqueueAgentTrace(controller, event, data)
          return
        }

        if (event === "speech_text.delta") {
          enqueueAgentTrace(controller, event, data)
          return
        }

        if (event === "internal_delta") {
          if (data.kind === "thinking") {
            if (isSpeechTextAgent(data)) {
              enqueueAgentTrace(controller, "agent.reasoning.delta", {
                ...data,
                source_agent: data.agent,
                text: data.content,
              })
            }
            return
          }
          enqueueAgentTrace(controller, "speech_text.delta", {
            ...data,
            source_agent: data.agent,
            text: data.content,
          })
          return
        }

        if (event === "agent.tool_call.delta" || event === "tool_call") {
          const toolCall = getToolCallPayload(data)
          controller.enqueue({
            type: "data-toolCall",
            ...(toolCall.id ? { id: toolCall.id } : {}),
            data: toolCall,
          })
          return
        }

        if (event === "agent.text.final" || event === "final") {
          if (getSourceAgent(data) && getSourceAgent(data) !== "main_agent") {
            enqueueAgentTrace(controller, "agent.text.final", data)
            return
          }

          sources.splice(0, sources.length, ...toChatSources(data.sources))
          return
        }

        if (event === "speech_text.final" || event === "speech_text") {
          const timestamp = createTimestamp()
          controller.enqueue({
            type: "data-speechText",
            data: {
              text: String(data.text ?? ""),
              sourceAgent: getSourceAgent(data),
              timestamp,
            },
          })
          enqueueAgentTrace(controller, "speech_text.final", { ...data, timestamp })
          return
        }

        if (event === "tts.audio.chunk" || event === "audio") {
          const audioBase64 = String(data.audio_base64 ?? "")
          if (audioBase64) {
            audioSourceAgent = getSourceAgent(data)
            audioChunkCount += 1
            controller.enqueue({
              type: "data-audioStatus",
              id: "tts-audio",
              data: {
                chunks: audioChunkCount,
                completed: false,
                sourceAgent: getSourceAgent(data),
              },
            })
            controller.enqueue({
              type: "data-audio",
              data: { audioBase64 },
              transient: true,
            })
          }
          return
        }

        if (event === "tts.completed" || event === "audio_done") {
          const completedChunks = Number(data.chunks ?? audioChunkCount)
          audioSourceAgent = getSourceAgent(data)
          controller.enqueue({
            type: "data-audioStatus",
            id: "tts-audio",
            data: {
              chunks: completedChunks,
              completed: true,
              sourceAgent: getSourceAgent(data),
            },
          })
          controller.enqueue({
            type: "data-audioDone",
            data: { chunks: completedChunks },
            transient: true,
          })
          return
        }

        // LangGraph lifecycle noise is intentionally dropped at the BFF boundary.
        if (
          event === "node.updated" ||
          event === "task.started" ||
          event === "task.completed" ||
          event === "task.failed"
        ) {
          return
        }

        if (event === "error") {
          const reason = String(data.message ?? "stream error")
          interruptAudio(reason)
          emitText(`서버 오류가 발생했어요. (${reason})`)
          finishReason = "error"
          shouldStop = true
        }
      }

      const processBuffer = () => {
        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() ?? ""

        for (const block of blocks) {
          const parsed = parseSseBlock(block)
          if (parsed) handleParsedBlock(parsed)
          if (shouldStop) break
        }
      }

      try {
        controller.enqueue({ type: "start" })
        enqueueMessageTimestamp(controller)

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
          interruptAudio("cancelled")
          controller.enqueue({ type: "abort", reason: "cancelled" })
        } else {
          interruptAudio(toErrorText(error))
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

export async function createBackendChatStream({ sessionId, message, metadata, signal }: BackendChatStreamOptions) {
  if (!message) {
    return createAssistantTextStream("질문 내용을 찾지 못했어요. 다시 입력해 주세요.", "error")
  }

  try {
    const response = await fetch(`${BACKEND_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ session_id: sessionId, message, metadata: metadata ?? {} }),
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
