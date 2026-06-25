import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircleQuestion, Sparkles } from "lucide-react";

import { FadeIn } from "@/ui/components/fade-in";
import { buttonVariants } from "@/ui/primitives/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <FadeIn direction="left" className="flex flex-col items-start gap-6 text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
            <Sparkles className="size-4" />
            어르신을 위한 RAG 기반 법률·복지 상담
          </span>

          <h1 className="font-heading text-4xl leading-tight text-foreground text-balance sm:text-5xl md:text-6xl">
            노인복지와 법률, <br />
            <span className="text-primary">로디</span>에게 물어보세요
          </h1>

          <p className="max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            기초연금, 노인일자리, 고령자 고용, 근로 문제까지. 검색 기반 AI가 실제 법령과
            공공 문서를 찾아 누구나 이해하기 쉬운 말로 답하고 근거까지 함께 보여드려요.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/chat"
              className={buttonVariants({
                size: "lg",
                className:
                  "h-auto min-h-9 w-full rounded-full px-5.5 py-4 text-center font-heading text-[1.625rem] leading-tight whitespace-normal sm:w-auto sm:whitespace-nowrap",
              })}
            >
              <MessageCircleQuestion className="size-5" />
              무료로 상담 시작하기
            </Link>
            <Link
              href="/#how"
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className:
                  "h-auto min-h-9 w-full rounded-full border-primary/30 bg-card px-5.5 py-4 font-heading text-[1.625rem] leading-tight whitespace-nowrap sm:w-auto",
              })}
            >
              이용 방법 보기
              <ArrowRight className="size-5" />
            </Link>
          </div>

          <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
            <div>
              <p className="font-heading text-2xl text-foreground">국가법령정보</p>
              <p>기반 근거 문서</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-heading text-2xl text-foreground">24시간</p>
              <p>언제든 답변</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn direction="right" delay={150} className="relative flex justify-center">
          <Link
            href="/chat"
            aria-label="상담 화면으로 이동"
            className="group relative flex aspect-square w-full max-w-md items-center justify-center rounded-[2.5rem] bg-gradient-to-b from-card to-secondary/60 shadow-xl ring-1 ring-border transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Image
              src="/mascots/mascot.png"
              alt="법률 가이드 책을 든 법률 챗봇 마스코트 로디"
              width={520}
              height={520}
              loading="eager"
              priority
              className="h-auto w-[90%] drop-shadow-2xl transition-opacity duration-300 group-hover:opacity-0"
            />
            <Image
              src="/mascots/mascot2.png"
              alt="법률 챗봇 마스코트 로디 호버"
              width={520}
              height={520}
              priority
              className="absolute h-auto w-[90%] opacity-0 drop-shadow-2xl transition-opacity duration-300 group-hover:opacity-100"
            />
            <span className="absolute -right-3 top-10 rounded-2xl bg-card px-4 py-2 text-sm font-medium text-foreground shadow-md ring-1 ring-border">
              안녕하세요, 로디예요!
            </span>
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}
