import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MascotAvatar } from "@/features/chat/components/mascot-avatar"

export function ChatPageHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#dfddd8]/70 bg-[#faf6f1]/90 px-4 backdrop-blur-md sm:px-6">
      <Link href="/" className="flex items-center gap-2 text-[#52545a] transition-colors hover:text-[#1a1919]">
        <ArrowLeft className="size-5" />
        <span className="text-sm font-medium">홈으로</span>
      </Link>
      <Link href="/" className="flex items-center gap-2">
        <MascotAvatar className="size-9 bg-[#fff3e7] ring-[#dfddd8]" imageSize={36} alt="" priority />
        <span className="font-heading text-xl text-[#1a1919]">로디</span>
      </Link>
      <span className="w-16" aria-hidden />
    </header>
  )
}
