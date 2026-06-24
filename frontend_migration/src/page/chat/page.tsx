import Link from "next/link";

import { Button } from "@/ui/primitives/button";

export function ChatPage() {
  return (
    <main className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-[360px] shrink-0 border-r border-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="border-b border-sidebar-border px-5 py-4">
          <h1 className="font-heading text-xl">로디 상담</h1>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-5">
          <div className="rounded-md border border-sidebar-border bg-sidebar-accent px-4 py-3 text-sm text-sidebar-accent-foreground">
            상담 대화 영역
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="font-heading text-lg">로디</div>
          <Button asChild variant="outline">
            <Link href="/mocks">목업 보기</Link>
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-md border border-border bg-card p-5 text-card-foreground">
            <h2 className="text-base font-semibold">상담 결과 패널</h2>
          </section>
          <aside className="rounded-md border border-border bg-card p-5 text-card-foreground">
            <h2 className="text-base font-semibold">상세 정보 패널</h2>
          </aside>
        </div>
      </section>
    </main>
  );
}
