import type { UIMessage } from "ai"

export type ChatSource = {
  title: string
  ref: string
}

export type ChatMessageMetadata = {
  sources?: ChatSource[]
}

export type ChatMessageData = {
  audio: {
    audioBase64: string
  }
  audioDone: {
    chunks: number
  }
  audioRequest: {
    sessionId?: string | null
    text: string
    turnId?: string | null
  }
  speechText: {
    text: string
  }
  toolCall: {
    id?: string | null
    name?: string | null
    status?: string | null
  }
}

export type LegalChatMessage = UIMessage<ChatMessageMetadata, ChatMessageData>
