import {
  AccessDetail,
  AccessMap,
} from "@/ui/components/chat/workspace_surface/access_summary/access-summary-components";
import type { ChatWorkspaceAccessSummarySurface } from "@/ui/components/chat/workspace_root/workspace-state";
import {
  WorkspaceBadge,
  WorkspaceSurfaceHeader,
} from "@/ui/components/chat/workspace_surface/shared/surface-primitives";

type AccessSummarySurfaceProps = {
  surface: ChatWorkspaceAccessSummarySurface;
};

export function AccessSummarySurface({ surface }: AccessSummarySurfaceProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-5 pb-4">
      <WorkspaceSurfaceHeader
        title={surface.title}
        description={surface.description}
        action={<WorkspaceBadge tone="success">{surface.copy.headerBadge}</WorkspaceBadge>}
      />

      <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(520px,1fr)_minmax(380px,0.58fr)]">
        <AccessMap institution={surface.institution} map={surface.map} />
        <AccessDetail
          copy={surface.copy}
          institution={surface.institution}
          travel={surface.travel}
          visitNotes={surface.visitNotes}
        />
      </div>
    </div>
  );
}
