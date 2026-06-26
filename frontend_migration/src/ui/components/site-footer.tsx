import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-background ring-2 ring-primary/30">
              <Image
                src="/mascots/mascot.png"
                alt="법률 챗봇 마스코트 로디"
                width={40}
                height={40}
                className="size-10 object-cover"
              />
            </span>
            <span className="font-heading text-xl text-foreground">로디</span>
          </Link>

          <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
            로디는 노인·고령층을 위한 검색 기반(RAG) AI 법률·복지 안내 서비스입니다. 제공되는
            정보는 참고용이며, 정확한 자격·금액과 구체적 사안은 행정복지센터·법률 전문가와 확인하시기 바랍니다.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/chat" className="transition-colors hover:text-foreground">
              상담 시작
            </Link>
            <Link href="/#character" className="transition-colors hover:text-foreground">
              캐릭터 소개
            </Link>
            <Link href="/#features" className="transition-colors hover:text-foreground">
              기능 소개
            </Link>
            <Link href="/#how" className="transition-colors hover:text-foreground">
              이용 방법
            </Link>
            <Link href="/#categories" className="transition-colors hover:text-foreground">
              상담 주제
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/70">© 2026 로디 법률 가이드. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
