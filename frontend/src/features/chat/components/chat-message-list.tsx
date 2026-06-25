import { ChatMessageBubble } from "@/features/chat/components/chat-message-bubble"
import type { LegalChatMessage } from "@/features/chat/types"

type ChatMessageListProps = {
  messages: LegalChatMessage[]
  status: "submitted" | "streaming" | "ready" | "error"
}

export function ChatMessageList({ messages, status }: ChatMessageListProps) {
  const showPendingAssistant = status === "submitted" && messages.at(-1)?.role === "user"

  return (
    <div className="flex flex-col gap-6">
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      {showPendingAssistant && <ChatMessageBubble pending />}
    </div>
  )
}
