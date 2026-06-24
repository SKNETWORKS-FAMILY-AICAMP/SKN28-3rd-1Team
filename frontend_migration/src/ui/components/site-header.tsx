import Image from "next/image";
import Link from "next/link";
import { Scale } from "lucide-react";

import { buttonVariants } from "@/ui/primitives/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-secondary ring-2 ring-primary/30">
            <Image
              src="/mascots/mascot.png"
              alt="법률 챗봇 마스코트 로디"
              width={36}
              height={36}
              loading="eager"
              className="size-9 object-cover"
            />
          </span>
          <span className="font-heading text-xl text-foreground">로디</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            기능 소개
          </Link>
          <Link
            href="/#how"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            이용 방법
          </Link>
          <Link
            href="/#categories"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            상담 주제
          </Link>
          <Link
            href="/mocks"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            디자인
          </Link>
        </nav>

        <Link
          href="/chat"
          className={buttonVariants({
            className: "rounded-full px-4 py-2 font-heading whitespace-nowrap",
          })}
        >
          <Scale className="size-4" />
          상담 시작
        </Link>
      </div>
    </header>
  );
}
