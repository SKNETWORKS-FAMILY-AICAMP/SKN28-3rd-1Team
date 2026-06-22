import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

import { mockScenes } from "./mock-scenes"

export default function MocksPage() {
  return (
    <main className="min-h-dvh bg-[#ece7e0] text-[#332f29]">
      <header className="border-b border-[#efe7da] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2.5 px-5">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] ring-1 ring-[#f4d6bd]">
            <Image src="/images/mascot.png" alt="로디" width={36} height={36} className="size-9 object-cover" />
          </span>
          <span className="font-heading text-lg">로디 디자인 목업</span>
          <div className="flex-1" />
          <Link href="/chat_page" className="rounded-[10px] border border-[#ead9c6] px-3.5 py-2 text-sm font-bold text-[#6c6359]">
            실제 상담 화면
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="max-w-3xl">
          <div className="text-xs font-extrabold uppercase tracking-wide text-[#a99c8f]">design scenes</div>
          <h1 className="mt-2 font-heading text-4xl text-[#2f2b26]">상담 화면 장면별 목업</h1>
          <p className="mt-4 text-base leading-relaxed text-[#7d7469]">
            상담 시작, 개인정보 입력, 지도 결과, 문서 레퍼런스 화면을 분리해서 확인할 수 있어요.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {mockScenes.map((scene) => {
            const Icon = scene.icon
            return (
              <Link
                key={scene.slug}
                href={`/mocks/${scene.slug}`}
                className="group flex min-h-[150px] items-start gap-4 rounded-[16px] border border-[#eadfce] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#f0b88e] hover:shadow-md"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-[13px] bg-[#f5eadc] text-[#d88951] transition group-hover:bg-[#ef8b54] group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-[#a99c8f]">{scene.eyebrow}</span>
                  <span className="mt-2 block font-heading text-xl text-[#2f2b26]">{scene.title}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-[#7d7469]">{scene.description}</span>
                </span>
                <ArrowRight className="mt-1 size-5 shrink-0 text-[#ef8b54]" />
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
