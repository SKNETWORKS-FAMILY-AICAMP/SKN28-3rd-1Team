import type { UIMessage } from "ai"

export type ChatSource = {
  title: string
  ref: string
}

export type ChatMessageMetadata = {
  sources?: ChatSource[]
}

export type ChatMessageData = {
  agentTrace: {
    type: string
    sourceAgent?: string | null
    node?: string | null
    text?: string
    toolCall?: {
      id?: string | null
      name?: string | null
      status?: string | null
      sourceAgent?: string | null
    }
  }
  audio: {
    audioBase64: string
  }
  audioDone: {
    chunks: number
  }
  audioStatus: {
    chunks: number
    completed: boolean
    sourceAgent?: string | null
  }
  speechText: {
    text: string
    sourceAgent?: string | null
  }
  toolCall: {
    event?: string
    id?: string | null
    name?: string | null
    status?: string | null
    sourceAgent?: string | null
  }
}

export type LegalChatMessage = UIMessage<ChatMessageMetadata, ChatMessageData>
