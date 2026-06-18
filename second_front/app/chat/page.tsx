import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChatInterface } from "@/components/chat-interface"
import { ArrowLeft } from "lucide-react"

export default function ChatPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#faf6f1]">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#dfddd8]/70 bg-[#faf6f1]/90 px-4 backdrop-blur-md sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[#52545a] transition-colors hover:text-[#1a1919]">
          <ArrowLeft className="size-5" />
          <span className="text-sm font-medium">홈으로</span>
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[#ffb199] ring-2 ring-[#ff764c]/30">
            <Image src="/images/mascot.png" alt="로디" width={36} height={36} className="size-9 object-cover" />
          </span>
          <span className="font-heading text-xl text-[#1a1919]">로디</span>
        </Link>
        <span className="w-16" aria-hidden />
      </header>

      <main className="flex-1">
        <Suspense fallback={null}>
          <ChatInterface />
        </Suspense>
      </main>
    </div>
  )
}
