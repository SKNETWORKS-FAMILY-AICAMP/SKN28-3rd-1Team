import {
  BookmarkSquareIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

import { MascotAvatar } from "@/ui/components/mascot/mascot-avatar";
import { cn } from "@/lib/utils";

type ChatHeaderProps = {
  canShowDocuments: boolean;
  onShowDocuments: () => void;
  onSaveSummary: () => void;
  onNewChat: () => void;
};

export function ChatHeader({
  canShowDocuments,
  onShowDocuments,
  onSaveSummary,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-8 border-b border-[var(--chat-border)] bg-[var(--chat-panel)] px-6">
      <Link href="/" className="flex items-center gap-2.5">
        <MascotAvatar className="size-10" imageSize={40} alt="로디" priority />
        <span className="font-heading text-xl text-[var(--chat-text-strong)]">
          로디
        </span>
      </Link>

      <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--chat-text-muted)] md:flex">
        <span>상담 주제</span>
        <span>이용 방법</span>
        <Link
          href="/mocks"
          className="font-medium transition-colors hover:text-[var(--chat-text-strong)]"
        >
          디자인
        </Link>
        <button
          type="button"
          onClick={onShowDocuments}
          aria-disabled={!canShowDocuments}
          className={cn(
            "font-medium transition-colors hover:text-[var(--chat-text-strong)]",
            !canShowDocuments && "cursor-not-allowed opacity-70"
          )}
        >
          근거 문서
        </button>
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onSaveSummary}
          className="hidden h-10 items-center gap-2 rounded-[10px] border border-[var(--chat-border-strong)] bg-[var(--chat-panel)] px-4 text-sm font-semibold text-[var(--chat-text-muted)] sm:inline-flex"
        >
          <BookmarkSquareIcon className="size-4 text-[var(--chat-primary)]" />
          상담 요약 저장
        </button>
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--chat-border-strong)] bg-[var(--chat-panel)] px-4 text-sm font-semibold text-[var(--chat-text-muted)]"
        >
          <PlusIcon className="size-4 text-[var(--chat-primary)]" />
          새 상담
        </button>
      </div>
    </header>
  );
}
