import { createUIMessageStream, createUIMessageStreamResponse } from "ai"
import type { UIMessageStreamWriter } from "ai"

import { createBackendChatStream, getLatestUserText } from "@/features/chat/services/chat-stream"
import type { LegalChatMessage } from "@/features/chat/types"

export const runtime = "nodejs"
export const maxDuration = 60

type ChatRouteRequest = {
  id?: string
  messages?: LegalChatMessage[]
}

function writeAssistantText(writer: UIMessageStreamWriter<LegalChatMessage>, text: string, finishReason: "stop" | "error") {
  const textPartId = "answer"

  writer.write({ type: "start" })
  writer.write({ type: "text-start", id: textPartId })
  writer.write({ type: "text-delta", id: textPartId, delta: text })
  writer.write({ type: "text-end", id: textPartId })
  writer.write({ type: "finish", finishReason })
}

export async function POST(request: Request) {
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
        message,
        signal: request.signal,
      })

      writer.merge(backendStream)
    },
    onError: () => "Agent 응답을 처리하지 못했어요.",
  })

  return createUIMessageStreamResponse({ stream })
}
