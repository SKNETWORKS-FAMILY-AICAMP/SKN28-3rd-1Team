import { ActionChecklistSurface } from "@/ui/components/chat/workspace_surface/action_checklist/action-checklist-surface";
import { DefaultWorkspaceSurface } from "@/ui/components/chat/workspace_surface/default/default-workspace-surface";
import { EvidenceDocumentsSurface } from "@/ui/components/chat/workspace_surface/evidence_documents/evidence-documents-surface";
import { InstitutionResultsSurface } from "@/ui/components/chat/workspace_surface/institution_results/institution-results-surface";
import { ProfileIntakeSurface } from "@/ui/components/chat/workspace_surface/profile_intake/profile-intake-surface";
import type {
  ChatWorkspaceCommand,
  ChatWorkspaceState,
} from "@/ui/components/chat/workspace_root/workspace-state";

type ChatWorkspaceRendererProps = {
  consultationBusy?: boolean;
  onCommand?: (command: ChatWorkspaceCommand) => void;
  onVoiceClick?: () => void;
  onStartConsultation?: (prompt: string) => void;
  state: ChatWorkspaceState;
  voiceInputActive?: boolean;
};

export function ChatWorkspaceRenderer({
  consultationBusy,
  onCommand,
  onVoiceClick,
  onStartConsultation,
  state,
  voiceInputActive,
}: ChatWorkspaceRendererProps) {
  switch (state.surface.type) {
    case "default":
      return (
        <DefaultWorkspaceSurface
          onVoiceClick={onVoiceClick}
          surface={state.surface}
          voiceInputActive={voiceInputActive}
        />
      );
    case "profile-intake":
      return (
        <ProfileIntakeSurface
          consultationBusy={consultationBusy}
          onStartConsultation={onStartConsultation}
          surface={state.surface}
        />
      );
    case "institution-results":
      return (
        <InstitutionResultsSurface
          onCommand={onCommand}
          surface={state.surface}
        />
      );
    case "evidence-documents":
      return <EvidenceDocumentsSurface surface={state.surface} />;
    case "action-checklist":
      return (
        <ActionChecklistSurface
          consultationBusy={consultationBusy}
          onStartConsultation={onStartConsultation}
          surface={state.surface}
        />
      );
    default:
      return assertNever(state.surface);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled chat workspace surface: ${String(value)}`);
}
