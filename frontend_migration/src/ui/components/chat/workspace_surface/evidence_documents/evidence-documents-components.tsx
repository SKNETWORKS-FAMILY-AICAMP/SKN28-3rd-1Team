import { DocumentTextIcon } from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";
import type {
  ChatWorkspaceEvidenceDocumentsSurface,
  WorkspaceEvidenceDocument,
} from "@/ui/components/chat/workspace_root/workspace-state";
import {
  WorkspaceBadge,
  WorkspacePanel,
} from "@/ui/components/chat/workspace_surface/shared/surface-primitives";

type EvidenceDocumentCopy = ChatWorkspaceEvidenceDocumentsSurface["copy"];

export function EvidenceDocumentList({
  documents,
  selectedDocumentId,
}: {
  documents: WorkspaceEvidenceDocument[];
  selectedDocumentId?: string;
}) {
  return (
    <div className="mt-4 grid min-h-0 flex-1 auto-rows-max grid-cols-1 content-start items-start gap-4 overflow-y-auto pr-1 xl:grid-cols-2">
      {documents.map((document) => {
        const isSelected = document.id === selectedDocumentId;

        return (
          <WorkspacePanel
            key={document.id}
            className={cn(
              "flex min-h-[220px] flex-col px-5 py-4",
              isSelected &&
                "border-[var(--chat-primary-border)] shadow-[var(--chat-shadow-soft)]"
            )}
          >
            <div className="flex items-start gap-3">
              <DocumentIcon selected={isSelected} />
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-extrabold leading-snug text-[var(--chat-text-strong)]">
                  {document.title}
                </div>
                <div className="mt-1 text-base font-semibold text-[var(--chat-text-muted)]">
                  {document.source} · {document.page}
                </div>
              </div>
              <WorkspaceBadge tone="success">{document.match}%</WorkspaceBadge>
            </div>

            <p className="mt-4 line-clamp-4 text-lg leading-8 text-[var(--chat-text)]">
              {document.summary}
            </p>

            <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
              {document.tags.map((tag) => (
                <WorkspaceBadge key={tag}>{tag}</WorkspaceBadge>
              ))}
            </div>
          </WorkspacePanel>
        );
      })}
    </div>
  );
}

export function EvidenceDocumentReport({
  copy,
  document,
  documents,
  selectedDocumentId,
}: {
  copy: EvidenceDocumentCopy;
  document: WorkspaceEvidenceDocument;
  documents: WorkspaceEvidenceDocument[];
  selectedDocumentId: string;
}) {
  return (
    <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <WorkspacePanel className="flex min-h-0 flex-col overflow-y-auto p-4">
        <div className="px-1 pb-3">
          <div className="text-2xl font-extrabold text-[var(--chat-text-strong)]">
            {copy.bundleTitle}
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--chat-text-muted)]">
            {copy.bundleDescription}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {documents.map((item) => {
            const isSelected = item.id === selectedDocumentId;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-[14px] border p-4 text-left transition",
                  isSelected
                    ? "border-[var(--chat-primary-border)] bg-[var(--chat-surface)] shadow-sm"
                    : "border-[var(--chat-border)] bg-[var(--chat-panel)]"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <DocumentIcon selected={isSelected} small />
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold leading-snug text-[var(--chat-text-strong)]">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[15px] font-semibold text-[var(--chat-text-muted)]">
                      {item.source} · {item.page}
                    </span>
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <WorkspaceBadge tone="info">{item.category}</WorkspaceBadge>
                  <span className="text-[15px] font-bold text-[var(--chat-success-text)]">
                    {copy.relevanceLabel} {item.match}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="min-h-0 overflow-y-auto bg-[var(--chat-document-bg)] px-5 py-5">
        <article className="max-w-none">
          <header className="border-b border-[var(--chat-border)] pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <WorkspaceBadge tone="info">{document.category}</WorkspaceBadge>
              <WorkspaceBadge tone="success">
                {copy.relevanceLabel} {document.match}%
              </WorkspaceBadge>
              <WorkspaceBadge>{document.page}</WorkspaceBadge>
            </div>
            <h2 className="mt-3 text-[38px] font-extrabold leading-tight text-[var(--chat-text-strong)]">
              {document.title}
            </h2>
            <div className="mt-2 text-lg font-semibold text-[var(--chat-text-muted)]">
              {document.source}
              {document.updated ? ` · ${document.updated}` : null}
            </div>
          </header>

          <section className="mt-4 rounded-[16px] border border-[var(--chat-border)] bg-[var(--chat-surface)] p-5">
            <div className="text-lg font-extrabold text-[var(--chat-text-muted)]">
              {copy.summaryTitle}
            </div>
            <p className="mt-3 text-xl leading-9 text-[var(--chat-text)]">
              {document.summary}
            </p>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.82fr)]">
            <section className="rounded-[16px] border border-[var(--chat-border)] bg-[var(--chat-panel)] p-5">
              <div className="text-lg font-extrabold text-[var(--chat-text-muted)]">
                {copy.citationTitle}
              </div>
              <p className="mt-3 text-xl leading-9 text-[var(--chat-text)]">
                {document.citation}
              </p>
            </section>

            <section className="rounded-[16px] border border-[var(--chat-border)] bg-[var(--chat-panel)] p-5">
              <div className="text-lg font-extrabold text-[var(--chat-text-muted)]">
                {copy.excerptTitle}
              </div>
              <blockquote className="mt-3 border-l-4 border-[var(--chat-primary-border)] pl-4 text-xl leading-9 text-[var(--chat-text)]">
                {document.excerpt}
              </blockquote>
            </section>
          </div>

          <section className="mt-4 rounded-[16px] border border-[var(--chat-border)] bg-[var(--chat-panel)] p-5">
            <div className="text-lg font-extrabold text-[var(--chat-text-muted)]">
              {copy.highlightsTitle}
            </div>
            <div className="mt-4 grid gap-3">
              {document.highlights.map((highlight, index) => (
                <div
                  key={highlight}
                  className="grid gap-3 rounded-[13px] bg-[var(--chat-surface)] p-4 sm:grid-cols-[42px_minmax(0,1fr)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-[var(--chat-primary-soft)] text-base font-extrabold text-[var(--chat-primary-strong)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-lg leading-8 text-[var(--chat-text)]">
                    {highlight}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <footer className="mt-5 flex flex-wrap gap-2">
            {document.tags.map((tag) => (
              <WorkspaceBadge key={tag}>{tag}</WorkspaceBadge>
            ))}
          </footer>
        </article>
      </WorkspacePanel>
    </div>
  );
}

function DocumentIcon({
  selected,
  small = false,
}: {
  selected: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[10px]",
        small ? "size-8" : "size-10",
        selected
          ? "bg-[var(--chat-primary)] text-white"
          : "bg-[var(--chat-sidebar-muted)] text-[var(--chat-primary)]"
      )}
    >
      <DocumentTextIcon className={small ? "size-4" : "size-5"} />
    </span>
  );
}
