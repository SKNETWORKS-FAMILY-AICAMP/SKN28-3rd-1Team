import { Suspense } from "react"

import { ChatPageClient } from "./chat-page-client"

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="h-dvh min-h-[660px] bg-[#ece7e0]" />}>
      <ChatPageClient />
    </Suspense>
  )
}
