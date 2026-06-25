import {
  EvidenceDocumentList,
  EvidenceDocumentReport,
} from "@/ui/components/chat/workspace_surface/evidence_documents/evidence-documents-components";
import type { ChatWorkspaceEvidenceDocumentsSurface } from "@/ui/components/chat/workspace_root/workspace-state";
import {
  WorkspaceBadge,
  WorkspaceSurfaceHeader,
} from "@/ui/components/chat/workspace_surface/shared/surface-primitives";

type EvidenceDocumentsSurfaceProps = {
  surface: ChatWorkspaceEvidenceDocumentsSurface;
};

export function EvidenceDocumentsSurface({
  surface,
}: EvidenceDocumentsSurfaceProps) {
  const selectedDocument =
    surface.documents.find(
      (document) => document.id === surface.selectedDocumentId
    ) ?? surface.documents[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-5 pb-4">
      <WorkspaceSurfaceHeader
        title={surface.title}
        description={surface.description}
        action={
          <WorkspaceBadge tone="primary" className="mt-1">
            {surface.copy.headerBadge}
          </WorkspaceBadge>
        }
      />

      {surface.view === "detail" && selectedDocument ? (
        <EvidenceDocumentReport
          copy={surface.copy}
          document={selectedDocument}
          documents={surface.documents}
          selectedDocumentId={selectedDocument.id}
        />
      ) : (
        <EvidenceDocumentList
          documents={surface.documents}
          selectedDocumentId={selectedDocument?.id}
        />
      )}
    </div>
  );
}
