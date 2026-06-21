import { BookText } from "lucide-react"

import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message"
import { MascotAvatar } from "@/features/chat/components/mascot-avatar"
import type { LegalChatMessage } from "@/features/chat/types"

type ChatMessageBubbleProps = {
  message?: LegalChatMessage
  pending?: boolean
}

const assistantMarkdownClassName = [
  "leading-7",
  "[&_a]:text-[#ec4e02] [&_a]:underline [&_a]:underline-offset-2",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-[#ffb391] [&_blockquote]:pl-4 [&_blockquote]:text-[#52545a]",
  "[&_code]:rounded [&_code]:bg-[#f7efe8] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
  "[&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold",
  "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold",
  "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_hr]:my-4 [&_hr]:border-[#dfddd8]",
  "[&_li]:my-1",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_p]:my-2",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#24211f] [&_pre]:p-3 [&_pre]:text-xs [&_pre]:text-white",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
  "[&_strong]:font-semibold",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left",
  "[&_td]:border [&_td]:border-[#dfddd8] [&_td]:px-3 [&_td]:py-2",
  "[&_th]:border [&_th]:border-[#dfddd8] [&_th]:bg-[#fff3e7] [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
].join(" ")

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
              <MessageResponse key={`${message.id}-${index}`} className={assistantMarkdownClassName}>
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
