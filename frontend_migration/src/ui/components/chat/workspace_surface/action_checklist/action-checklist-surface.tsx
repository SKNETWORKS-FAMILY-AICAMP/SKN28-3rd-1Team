import {
  ChecklistNextAction,
  ChecklistStepGroup,
} from "@/ui/components/chat/workspace_surface/action_checklist/action-checklist-components";
import type { ChatWorkspaceActionChecklistSurface } from "@/ui/components/chat/workspace_root/workspace-state";
import {
  WorkspaceBadge,
  WorkspaceSurfaceHeader,
} from "@/ui/components/chat/workspace_surface/shared/surface-primitives";

type ActionChecklistSurfaceProps = {
  consultationBusy?: boolean;
  onStartConsultation?: (prompt: string) => void;
  surface: ChatWorkspaceActionChecklistSurface;
};

export function ActionChecklistSurface({
  consultationBusy = false,
  onStartConsultation,
  surface,
}: ActionChecklistSurfaceProps) {
  const requiredCount = surface.items.filter((item) => item.required).length;
  const doneCount = surface.items.filter((item) => item.status === "done").length;
  const nextActionPrompt = createChecklistNextActionPrompt(surface);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-5 pb-4">
      <WorkspaceSurfaceHeader
        title={surface.title}
        description={surface.description}
        action={
          <div className="flex gap-2">
            <WorkspaceBadge tone="primary">필수 {requiredCount}</WorkspaceBadge>
            <WorkspaceBadge tone="success">완료 {doneCount}</WorkspaceBadge>
          </div>
        }
      />

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {surface.items.map((item, index) => (
          <ChecklistStepGroup key={item.id} index={index} item={item} />
        ))}
      </div>

      <ChecklistNextAction
        actionLabel={surface.nextActionLabel}
        description={surface.nextActionDescription}
        disabled={consultationBusy}
        onAction={() => onStartConsultation?.(nextActionPrompt)}
        title={surface.nextActionTitle}
      />
    </div>
  );
}

function createChecklistNextActionPrompt(
  surface: ChatWorkspaceActionChecklistSurface
) {
  const explicitPrompt = surface.nextActionPrompt?.trim();

  if (explicitPrompt) return explicitPrompt;

  const nextActionText = [
    surface.nextActionTitle,
    surface.nextActionDescription,
    surface.nextActionLabel,
  ].join(" ");

  if (/(시·군·구|시군구|주소|거주지|지역)/.test(nextActionText)) {
    return [
      "거주하는 시·군·구를 입력할 수 있는 상담 정보 입력 폼을 열어줘.",
      "시·군·구 또는 거주지 확인에 필요한 항목만 우선 보여줘.",
    ].join("\n");
  }

  return [
    `다음 실행 항목 "${surface.nextActionLabel}"을 진행할 수 있게 도와줘.`,
    "필요한 입력 폼이나 다음 안내 화면이 있으면 열어줘.",
  ].join("\n");
}
