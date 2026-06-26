import { AnimatedMascot } from "@/ui/components/mascot/animated-mascot";
import { cn } from "@/lib/utils";
import type { ChatWorkspaceDefaultSurface } from "@/ui/components/chat/workspace_root/workspace-state";

type DefaultWorkspaceSurfaceProps = {
  onVoiceClick?: () => void;
  surface: ChatWorkspaceDefaultSurface;
  voiceInputActive?: boolean;
};

export function DefaultWorkspaceSurface({
  onVoiceClick,
  surface,
  voiceInputActive = false,
}: DefaultWorkspaceSurfaceProps) {
  const mascotLabel = voiceInputActive ? "음성 입력 중지" : "음성 입력 시작";
  const mascotFrameClassName = cn(
    "chat-workspace-mascot-float flex size-[min(440px,52vw,46vh)] items-center justify-center overflow-hidden rounded-full bg-[var(--chat-mascot-bg)] shadow-[var(--chat-mascot-shadow-lg)]",
    onVoiceClick &&
      "cursor-pointer transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--chat-primary-ring)]"
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-10 py-8 text-center">
      {onVoiceClick ? (
        <button
          type="button"
          aria-label={mascotLabel}
          aria-pressed={voiceInputActive}
          className={mascotFrameClassName}
          onClick={onVoiceClick}
          title={mascotLabel}
        >
          <AnimatedMascot
            animation={surface.mascot.animation}
            className="max-w-[74%]"
            shadow
            size="74%"
          />
        </button>
      ) : (
        <span className={mascotFrameClassName}>
          <AnimatedMascot
            animation={surface.mascot.animation}
            className="max-w-[74%]"
            shadow
            size="74%"
          />
        </span>
      )}
      <h1 className="mt-7 text-[32px] font-extrabold tracking-normal text-[var(--chat-text-strong)]">
        {surface.title}
      </h1>
      <p className="mt-2 max-w-[520px] text-lg leading-8 text-[var(--chat-text-muted)]">
        {surface.description}
      </p>
      {surface.statusLabel ? (
        <div className="mt-5 rounded-[10px] border border-[var(--chat-primary-border)] bg-[var(--chat-surface)] px-4 py-2.5 text-base font-bold text-[var(--chat-primary-strong)]">
          {surface.statusLabel}
        </div>
      ) : null}
    </div>
  );
}
