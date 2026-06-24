import Link from "next/link";

import { mockScenes } from "@/page/mocks/scenes";

export function MocksPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="font-heading text-2xl">로디 목업</h1>
          </div>
          <Link
            href="/chat"
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
          >
            /chat
          </Link>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mockScenes.map((scene) => (
            <Link
              key={scene.slug}
              href={`/mocks/${scene.slug}`}
              className="rounded-md border border-border bg-card p-4 text-card-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              <div className="text-base font-semibold">{scene.title}</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {scene.description}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
