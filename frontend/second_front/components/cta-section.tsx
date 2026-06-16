import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MessageCircleQuestion } from "lucide-react"

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-6 py-14 text-center shadow-lg sm:px-12">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-primary-foreground/10 blur-2xl" aria-hidden />
        <div className="relative flex flex-col items-center gap-6">
          <span className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-primary-foreground ring-4 ring-primary-foreground/30">
            <Image
              src="/images/mascot.png"
              alt="법률 챗봇 마스코트 로디"
              width={80}
              height={80}
              className="size-20 object-cover"
            />
          </span>
          <h2 className="font-heading text-3xl text-primary-foreground text-balance sm:text-4xl">
            지금 바로 로디와 이야기해보세요
          </h2>
          <p className="max-w-md text-pretty text-lg leading-relaxed text-primary-foreground/90">
            가입 없이 무료로. 기초연금·노인복지·고용 등 궁금한 점을 첫 질문으로 던져보세요.
          </p>
          <Button asChild size="lg" variant="secondary" className="rounded-full font-heading text-base px-6 py-3 whitespace-nowrap">
            <Link href="/chat" className="flex items-center gap-2">
              <MessageCircleQuestion className="size-5" />
              상담 시작하기
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
