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
