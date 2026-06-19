import { BookText } from "lucide-react"

import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message"
import { MascotAvatar } from "@/features/chat/components/mascot-avatar"
import type { LegalChatMessage } from "@/features/chat/types"

type ChatMessageBubbleProps = {
  message?: LegalChatMessage
  pending?: boolean
}

function getText(message: LegalChatMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function PendingIndicator() {
  return (
    <span className="flex items-center gap-2 py-1 text-[#76716f]">
      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#ff3c00] [animation-delay:-0.3s]" />
      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#ff3c00] [animation-delay:-0.15s]" />
      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#ff3c00]" />
    </span>
  )
}

export function ChatMessageBubble({ message, pending = false }: ChatMessageBubbleProps) {
  if (pending || !message) {
    return (
      <div className="flex items-start gap-4">
        <MascotAvatar className="h-12 w-12 shrink-0" />
        <div className="max-w-[80%] rounded-[40px] rounded-tl-[14px] border border-[#dfddd8] bg-white px-5 py-4 text-sm leading-7 text-[#1a1919]">
          <PendingIndicator />
        </div>
      </div>
    )
  }

  if (message.role === "user") {
    return (
      <Message from="user" className="max-w-full">
        <MessageContent className="max-w-[80%] whitespace-pre-wrap rounded-[40px] rounded-br-[14px] bg-[#ff3c00] px-5 py-4 text-sm leading-7 text-white">
          {getText(message)}
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message from="assistant" className="max-w-full flex-row items-start gap-4">
      <MascotAvatar className="h-12 w-12 shrink-0" />
      <div className="max-w-[80%] space-y-3">
        <MessageContent className="rounded-[40px] rounded-tl-[14px] border border-[#dfddd8] bg-white px-5 py-4 text-sm leading-7 text-[#1a1919]">
          {message.parts.map((part, index) => {
            if (part.type !== "text") return null

            return (
              <MessageResponse key={`${message.id}-${index}`} className="whitespace-pre-wrap leading-7">
                {part.text}
              </MessageResponse>
            )
          })}
        </MessageContent>
        {message.metadata?.sources && message.metadata.sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.metadata.sources.map((source, index) => (
              <span
                key={`${source.title}-${source.ref}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#ff764c] px-3 py-1 text-xs font-medium text-white"
              >
                <BookText className="size-3.5" />
                <span>{source.title}</span>
                <span className="text-white/75">· {source.ref}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </Message>
  )
}
