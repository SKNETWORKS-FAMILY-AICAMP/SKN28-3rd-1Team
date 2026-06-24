import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  DocumentMagnifyingGlassIcon,
  MapPinIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/ui/primitives/button";

const primaryTopics = [
  {
    title: "기초연금",
    description: "신청 조건과 준비 서류를 확인합니다.",
    href: "/chat?topic=basic-pension",
    icon: DocumentMagnifyingGlassIcon,
  },
  {
    title: "노인일자리",
    description: "지역별 신청 기관과 접수 절차를 찾습니다.",
    href: "/chat?topic=senior-jobs",
    icon: MapPinIcon,
  },
  {
    title: "권리 보호",
    description: "차별, 임금, 계약 문제의 대응 근거를 정리합니다.",
    href: "/chat?topic=rights",
    icon: ShieldCheckIcon,
  },
];

const highlights = ["공공 문서 기반", "상담 맥락 유지", "근거 확인 흐름"];

export function HomePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
              <Image
                src="/mascots/mascot.png"
                alt="로디"
                width={36}
                height={36}
                className="size-9 object-cover"
                priority
              />
            </span>
            <span className="font-heading text-xl">로디</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link href="#topics" className="transition hover:text-foreground">
              상담 주제
            </Link>
            <Link href="/mocks" className="transition hover:text-foreground">
              목업
            </Link>
          </nav>

          <Button asChild>
            <Link href="/chat">
              <ChatBubbleLeftRightIcon className="size-4" />
              상담 시작
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-border">
          <Image
            src="/mascots/mascot2.png"
            alt=""
            width={760}
            height={760}
            priority
            aria-hidden
            className="pointer-events-none absolute bottom-[-140px] right-[-110px] z-[-1] w-[520px] max-w-[80vw] object-contain opacity-25 md:bottom-[-190px] md:right-[max(-120px,calc((100vw-1180px)/2))] md:w-[680px] md:opacity-35"
          />
          <div className="mx-auto flex min-h-[72dvh] max-w-6xl items-center px-5 py-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-primary">
                <ScaleIcon className="size-4" />
                노인·고령층 법률·복지 상담
              </div>
              <h1 className="mt-5 font-heading text-6xl leading-none tracking-normal text-foreground sm:text-7xl md:text-8xl">
                로디
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                기초연금, 노인일자리, 고령자 고용과 권리 보호 질문을 공공 문서와 법령 근거에 맞춰
                상담 흐름으로 이어갑니다.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-11 px-4 text-base">
                  <Link href="/chat">
                    상담 시작
                    <ArrowRightIcon className="size-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 px-4 text-base">
                  <Link href="/mocks">목업 비교</Link>
                </Button>
              </div>

              <dl className="mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                {highlights.map((label) => (
                  <div key={label} className="rounded-md border border-border bg-card px-4 py-3">
                    <dt className="text-sm font-semibold text-foreground">{label}</dt>
                    <dd className="mt-1 text-xs leading-5 text-muted-foreground">migration baseline</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section id="topics" className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-heading text-3xl">상담 주제</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                자주 확인하는 상담 흐름부터 먼저 마이그레이션해서 기존 화면과 비교합니다.
              </p>
            </div>
            <Link href="/chat" className="text-sm font-semibold text-primary transition hover:text-foreground">
              전체 상담 열기
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {primaryTopics.map((topic) => (
              <Link
                key={topic.title}
                href={topic.href}
                className="group rounded-md border border-border bg-card p-5 text-card-foreground transition hover:border-primary hover:bg-accent hover:text-accent-foreground"
              >
                <topic.icon className="size-6 text-primary transition group-hover:text-accent-foreground" />
                <h3 className="mt-4 text-base font-semibold">{topic.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground group-hover:text-accent-foreground/80">
                  {topic.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
