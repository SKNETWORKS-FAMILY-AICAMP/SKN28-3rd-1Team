import Link from "next/link";

import type { MockScene } from "@/page/mocks/scenes";

type MockScenePageProps = {
  scene: MockScene;
};

export function MockScenePage({ scene }: MockScenePageProps) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <Link href="/mocks" className="text-sm font-semibold text-muted-foreground">
              목업 목록
            </Link>
            <h1 className="mt-2 font-heading text-2xl">{scene.title}</h1>
          </div>
          <Link
            href="/chat"
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
          >
            /chat
          </Link>
        </header>

        <section className="grid min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-md border border-border bg-card p-4 text-card-foreground">
            <h2 className="text-base font-semibold">상담 패널</h2>
          </aside>
          <div className="rounded-md border border-border bg-card p-4 text-card-foreground">
            <h2 className="text-base font-semibold">{scene.description}</h2>
          </div>
        </section>
      </div>
    </main>
  );
}
