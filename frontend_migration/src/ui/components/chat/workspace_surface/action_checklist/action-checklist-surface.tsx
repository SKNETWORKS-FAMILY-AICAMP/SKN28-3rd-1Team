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
  surface: ChatWorkspaceActionChecklistSurface;
};

export function ActionChecklistSurface({
  surface,
}: ActionChecklistSurfaceProps) {
  const requiredCount = surface.items.filter((item) => item.required).length;
  const doneCount = surface.items.filter((item) => item.status === "done").length;

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
        title={surface.nextActionTitle}
      />
    </div>
  );
}
