import { createUIMessageStream, createUIMessageStreamResponse } from "ai"
import type { UIMessageStreamWriter } from "ai"

import type { LegalChatMessage } from "./contract"

import { createBackendChatStream, getLatestUserText } from "./backend-chat-stream-adapter"
import type { ChatWorkspaceSnapshot } from "@/ui/components/chat/workspace_root/workspace-state"
import { checkDemoChatRateLimit } from "./rate-limit"

type ChatRouteRequest = {
  id?: string
  applicationState?: ChatWorkspaceSnapshot
  messages?: LegalChatMessage[]
  profile?: {
    birthYear?: string
    location?: string
  }
}

const INTERNAL_STREAM_METADATA = {
  client: "chat_page",
  streamReasoningTokens: true,
  streamScreenControlAgent: true,
  streamSpeechAgent: true,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function createBackendMetadata(applicationState: unknown) {
  return {
    ...INTERNAL_STREAM_METADATA,
    ...(isRecord(applicationState) ? { application_state: applicationState } : {}),
  }
}

function writeAssistantText(writer: UIMessageStreamWriter<LegalChatMessage>, text: string, finishReason: "stop" | "error") {
  const textPartId = "answer"

  writer.write({ type: "start" })
  writer.write({ type: "text-start", id: textPartId })
  writer.write({ type: "text-delta", id: textPartId, delta: text })
  writer.write({ type: "text-end", id: textPartId })
  writer.write({ type: "finish", finishReason })
}

function createBackendMessage(message: string, profile?: ChatRouteRequest["profile"]) {
  const birthYear = typeof profile?.birthYear === "string" ? profile.birthYear.trim() : ""
  const location = typeof profile?.location === "string" ? profile.location.trim() : ""
  const profileLines = [
    birthYear ? `태어난 년도: ${birthYear}` : "",
    location ? `사는 곳: ${location}` : "",
  ].filter(Boolean)

  if (profileLines.length === 0) return message

  return `상담자 정보:\n${profileLines.join("\n")}\n\n질문:\n${message}`
}

export async function handleChatPost(request: Request) {
  const rateLimit = checkDemoChatRateLimit(request)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    )
  }

  let body: ChatRouteRequest

  try {
    body = (await request.json()) as ChatRouteRequest
  } catch {
    body = {}
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  const message = getLatestUserText(messages)

  const stream = createUIMessageStream<LegalChatMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      if (!message) {
        writeAssistantText(writer, "질문 내용을 찾지 못했어요. 다시 입력해 주세요.", "error")
        return
      }

      const backendStream = await createBackendChatStream({
        sessionId: body.id,
        message: createBackendMessage(message, body.profile),
        metadata: createBackendMetadata(body.applicationState),
        signal: request.signal,
      })

      writer.merge(backendStream)
    },
    onError: () => "Agent 응답을 처리하지 못했어요.",
  })

  return createUIMessageStreamResponse({ stream })
}
