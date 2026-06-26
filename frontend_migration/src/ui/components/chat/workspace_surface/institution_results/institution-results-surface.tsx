import {
  InstitutionList,
  InstitutionMap,
  SelectedInstitutionSummary,
} from "@/ui/components/chat/workspace_surface/institution_results/institution-results-components";
import type {
  ChatWorkspaceCommand,
  ChatWorkspaceInstitutionResultsSurface,
} from "@/ui/components/chat/workspace_root/workspace-state";
import {
  WorkspaceBadge,
  WorkspacePanel,
  WorkspaceSurfaceHeader,
} from "@/ui/components/chat/workspace_surface/shared/surface-primitives";

type InstitutionResultsSurfaceProps = {
  onCommand?: (command: ChatWorkspaceCommand) => void;
  surface: ChatWorkspaceInstitutionResultsSurface;
};

export function InstitutionResultsSurface({
  onCommand,
  surface,
}: InstitutionResultsSurfaceProps) {
  const selectedInstitution =
    surface.institutions.find(
      (institution) => institution.id === surface.selectedInstitutionId
    ) ?? surface.institutions[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-5 pb-4">
      <WorkspaceSurfaceHeader
        title={surface.title}
        description={surface.description}
        action={<WorkspaceBadge tone="info">{surface.copy.headerBadge}</WorkspaceBadge>}
      />

      <div className="mt-4 grid min-h-[430px] flex-1 gap-4 lg:grid-cols-[minmax(520px,1fr)_minmax(280px,0.42fr)]">
        <WorkspacePanel className="flex min-h-[430px] min-w-0 flex-col overflow-hidden p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="text-xl font-extrabold text-[var(--chat-text-strong)]">
                {surface.copy.mapTitle}
              </div>
              <div className="text-base font-semibold text-[var(--chat-text-muted)]">
                {surface.copy.mapDescription}
              </div>
            </div>
            <WorkspaceBadge tone="info">{surface.copy.mapBadge}</WorkspaceBadge>
          </div>
          <InstitutionMap
            institutions={surface.institutions}
            map={surface.map}
            onSelectInstitution={(institutionId) =>
              onCommand?.({
                type: "workspace.selectInstitution",
                institutionId,
              })
            }
            selectedInstitutionId={selectedInstitution?.id}
          />
        </WorkspacePanel>

        <WorkspacePanel className="flex min-h-[430px] min-w-0 flex-col overflow-hidden p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-extrabold text-[var(--chat-text-strong)]">
                {surface.copy.listTitle}
              </div>
              <div className="text-base font-semibold text-[var(--chat-text-muted)]">
                {surface.copy.listDescription}
              </div>
            </div>
            <WorkspaceBadge tone="primary">
              {surface.institutions.length}
              {surface.copy.countSuffix}
            </WorkspaceBadge>
          </div>
          <InstitutionList
            institutions={surface.institutions}
            onSelectInstitution={(institutionId) =>
              onCommand?.({
                type: "workspace.selectInstitution",
                institutionId,
              })
            }
            selectedInstitutionId={selectedInstitution?.id}
          />
        </WorkspacePanel>
      </div>

      {selectedInstitution ? (
        <SelectedInstitutionSummary
          contactActionLabel={surface.copy.contactActionLabel}
          directionsActionLabel={surface.copy.directionsActionLabel}
          institution={selectedInstitution}
        />
      ) : null}
    </div>
  );
}
