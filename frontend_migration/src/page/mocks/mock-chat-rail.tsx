import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";
import { MascotAvatar } from "@/ui/components/mascot/mascot-avatar";

type MockChatRailProps = {
  className?: string;
  hasConversation: boolean;
  questions: string[];
};

export function MockChatRail({
  className,
  hasConversation,
  questions,
}: MockChatRailProps) {
  return (
    <aside
      className={cn(
        "hidden w-[372px] shrink-0 flex-col border-r border-[var(--chat-border)] bg-[var(--chat-sidebar)] lg:flex",
        className
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--chat-border)] px-4">
        <span className="text-sm font-extrabold uppercase tracking-normal text-[var(--chat-text-muted)]">
          상담
        </span>
        <span className="rounded-full bg-[var(--chat-sidebar-muted)] px-2 py-1 text-xs font-bold text-[var(--chat-text-muted)]">
          mock
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <MockChatBubble
          role="assistant"
          text={"안녕하세요, 로디에요!\n궁금한 점을 편하게 물어보세요."}
        />

        {hasConversation ? (
          <>
            <MockChatBubble
              role="user"
              text="강남구에서 신청 가능한 노인일자리 알려줘"
            />
            <MockChatBubble
              role="assistant"
              text="신청 가능 기관과 근거 문서를 오른쪽 화면에 정리했어요."
            />
          </>
        ) : null}

        <div className="mt-auto flex flex-col gap-2">
          {questions.map((question) => (
            <div
              key={question}
              className="rounded-[12px] border border-[var(--chat-border)] bg-[var(--chat-panel)] px-3 py-2 text-sm font-semibold leading-6 text-[var(--chat-text-muted)]"
            >
              {question}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="flex items-center gap-2 rounded-[14px] border border-[var(--chat-border-strong)] bg-[var(--chat-panel)] py-2.5 pl-4 pr-2">
          <span className="min-w-0 flex-1 text-base text-[var(--chat-text-soft)]">
            메시지를 입력하세요...
          </span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[var(--chat-primary)] text-white shadow-[var(--chat-shadow-primary)]">
            <PaperAirplaneIcon className="size-4" />
          </span>
        </div>
      </div>
    </aside>
  );
}

function MockChatBubble({
  role,
  text,
}: {
  role: "assistant" | "user";
  text: string;
}) {
  const isUser = role === "user";

  return (
    <div className="flex items-start gap-2">
      {isUser ? (
        <span className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--chat-sidebar-muted)] text-xs font-bold text-[var(--chat-text-muted)]">
          나
        </span>
      ) : (
        <MascotAvatar className="size-[30px]" imageSize={30} alt="" />
      )}
      <div
        className={cn(
          "max-w-[286px] whitespace-pre-wrap rounded-[4px_14px_14px_14px] px-3.5 py-3 text-base leading-7",
          isUser
            ? "bg-[var(--chat-user-bubble)] text-[var(--chat-text)]"
            : "border border-[var(--chat-border)] bg-[var(--chat-panel)] text-[var(--chat-text)]"
        )}
      >
        {text}
      </div>
    </div>
  );
}
