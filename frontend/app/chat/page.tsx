import { Suspense } from "react"
import { ChatInterface } from "@/features/chat/components/chat-interface"
import { ChatPageHeader } from "@/features/chat/components/chat-page-header"

export default function ChatPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#faf6f1]">
      <ChatPageHeader />

      <main className="flex-1">
        <Suspense fallback={null}>
          <ChatInterface />
        </Suspense>
      </main>
    </div>
  )
}
