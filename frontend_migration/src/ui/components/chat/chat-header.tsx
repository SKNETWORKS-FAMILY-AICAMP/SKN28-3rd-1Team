import { PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { MascotAvatar } from "@/ui/components/mascot/mascot-avatar";

type ChatHeaderProps = {
  onNewChat: () => void;
};

export function ChatHeader({
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

      <div className="flex-1" />

      <div className="flex items-center gap-2.5">
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
