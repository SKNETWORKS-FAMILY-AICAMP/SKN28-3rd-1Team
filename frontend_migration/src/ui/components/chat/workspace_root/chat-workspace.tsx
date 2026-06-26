import { ChatWorkspaceRenderer } from "@/ui/components/chat/workspace_root/workspace-renderer";
import type {
  ChatWorkspaceCommand,
  ChatWorkspaceState,
} from "@/ui/components/chat/workspace_root/workspace-state";

type ChatWorkspaceProps = {
  consultationBusy?: boolean;
  onCommand?: (command: ChatWorkspaceCommand) => void;
  onVoiceClick?: () => void;
  onStartConsultation?: (prompt: string) => void;
  state: ChatWorkspaceState;
  voiceInputActive?: boolean;
};

export function ChatWorkspace({
  consultationBusy,
  onCommand,
  onVoiceClick,
  onStartConsultation,
  state,
  voiceInputActive,
}: ChatWorkspaceProps) {
  return (
    <section
      aria-label="상담 작업 화면"
      className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[var(--chat-bg)]"
    >
      <ChatWorkspaceRenderer
        consultationBusy={consultationBusy}
        onCommand={onCommand}
        onVoiceClick={onVoiceClick}
        onStartConsultation={onStartConsultation}
        state={state}
        voiceInputActive={voiceInputActive}
      />
    </section>
  );
}
