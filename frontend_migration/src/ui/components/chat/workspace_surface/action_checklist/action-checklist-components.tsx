import {
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";
import type { WorkspaceChecklistItem } from "@/ui/components/chat/workspace_root/workspace-state";
import {
  WorkspaceBadge,
  WorkspacePanel,
} from "@/ui/components/chat/workspace_surface/shared/surface-primitives";

export function ChecklistStepGroup({
  index,
  item,
}: {
  index: number;
  item: WorkspaceChecklistItem;
}) {
  const Icon = item.status === "warning" ? ExclamationTriangleIcon : CheckCircleIcon;

  return (
    <details
      open={item.defaultExpanded}
      className={cn(
        "group rounded-[18px] border border-[var(--chat-border)] bg-[var(--chat-panel)]",
        item.status === "warning" &&
          "border-[color-mix(in_oklch,var(--chat-primary),#facc15_38%)]"
      )}
    >
      <summary className="flex cursor-pointer list-none items-start gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border-2",
            item.status === "done"
              ? "border-[var(--chat-success-text)] bg-[var(--chat-success-bg)] text-[var(--chat-success-text)]"
              : item.status === "warning"
                ? "border-[#f3c66d] bg-[#fff0cc] text-[#a76718]"
                : "border-[var(--chat-primary-border)] bg-[var(--chat-primary-soft)] text-[var(--chat-primary-strong)]"
          )}
        >
          <Icon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-extrabold text-[var(--chat-text-muted)]">
              STEP {index + 1}
            </span>
            {item.required ? (
              <WorkspaceBadge tone="primary">필수</WorkspaceBadge>
            ) : (
              <WorkspaceBadge>선택</WorkspaceBadge>
            )}
            <WorkspaceBadge tone={statusTone(item.status)}>
              {statusLabel(item.status)}
            </WorkspaceBadge>
          </div>
          <h2 className="mt-2 text-2xl font-extrabold text-[var(--chat-text-strong)]">
            {item.title}
          </h2>
          <p className="mt-2 text-lg leading-8 text-[var(--chat-text)]">
            {item.detail}
          </p>
          {item.meta ? (
            <div className="mt-2 text-base font-semibold text-[var(--chat-text-muted)]">
              {item.meta}
            </div>
          ) : null}
        </div>

        <ChevronDownIcon className="mt-2 size-5 shrink-0 text-[var(--chat-text-muted)] transition group-open:rotate-180" />
      </summary>

      <div className="border-t border-[var(--chat-border)] px-5 pb-5 pt-4">
        <div className="grid gap-3 md:grid-cols-2">
          {(item.steps ?? []).map((step) => (
            <div
              key={step.id}
              className="rounded-[14px] border border-[var(--chat-border)] bg-[var(--chat-surface)] p-4"
            >
              <div className="flex items-start gap-3">
                <StepStatusDot status={step.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-extrabold text-[var(--chat-text-strong)]">
                      {step.title}
                    </h3>
                    <WorkspaceBadge tone={statusTone(step.status)}>
                      {statusLabel(step.status)}
                    </WorkspaceBadge>
                  </div>
                  <p className="mt-2 text-base leading-7 text-[var(--chat-text)]">
                    {step.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

export function ChecklistNextAction({
  actionLabel,
  description,
  title,
}: {
  actionLabel: string;
  description: string;
  title: string;
}) {
  return (
    <WorkspacePanel className="mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--chat-primary)] text-white">
          <ClipboardDocumentCheckIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-2xl font-extrabold text-[var(--chat-text-strong)]">
            {title}
          </div>
          <p className="text-lg leading-8 text-[var(--chat-text-muted)]">
            {description}
          </p>
        </div>
      </div>
      <span className="flex h-12 min-w-44 items-center justify-center rounded-[11px] bg-[var(--chat-primary)] px-5 text-lg font-bold text-white shadow-[var(--chat-shadow-primary)]">
        {actionLabel}
      </span>
    </WorkspacePanel>
  );
}

function StepStatusDot({ status }: { status: WorkspaceChecklistItem["status"] }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-[var(--chat-panel)]",
        status === "done" &&
          "border-[var(--chat-success-text)] bg-[var(--chat-success-bg)]",
        status === "warning" && "border-[#f3c66d] bg-[#fff0cc]",
        (status === "todo" || status === "ready") &&
          "border-[var(--chat-primary-border)]"
      )}
    >
      <span
        className={cn(
          "size-2.5 rounded-full",
          status === "done" && "bg-[var(--chat-success-text)]",
          status === "warning" && "bg-[var(--chat-warning-text)]",
          status === "ready" && "bg-[var(--chat-primary)]",
          status === "todo" && "bg-[var(--chat-border-strong)]"
        )}
      />
    </span>
  );
}

function statusLabel(status: WorkspaceChecklistItem["status"]) {
  if (status === "done") return "완료";
  if (status === "warning") return "주의";
  if (status === "ready") return "준비";
  return "할 일";
}

function statusTone(status: WorkspaceChecklistItem["status"]) {
  if (status === "done") return "success";
  if (status === "warning") return "warning";
  if (status === "ready") return "info";
  return "neutral";
}
