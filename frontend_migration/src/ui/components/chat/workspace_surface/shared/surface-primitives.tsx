import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { WorkspaceBadgeTone } from "@/ui/components/chat/workspace_root/workspace-state";

type WorkspaceSurfaceHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function WorkspaceSurfaceHeader({
  title,
  description,
  action,
}: WorkspaceSurfaceHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[32px] font-extrabold tracking-normal text-[var(--chat-text-strong)]">
          {title}
        </h1>
        <p className="mt-2 max-w-4xl text-lg leading-8 text-[var(--chat-text-muted)]">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function WorkspaceBadge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: WorkspaceBadgeTone;
}) {
  return (
    <span
      className={cn(
        "chat-badge rounded-lg px-3 py-1.5 text-[15px] font-semibold",
        className
      )}
      data-tone={tone}
    >
      {children}
    </span>
  );
}

export function WorkspacePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceInfoBlock({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[15px] font-extrabold text-[var(--chat-text-muted)]">
        {label}
      </div>
      <div className="text-lg leading-relaxed text-[var(--chat-text)]">{value}</div>
    </div>
  );
}

export function WorkspaceDetailBlock({
  bordered = false,
  label,
  value,
}: {
  bordered?: boolean;
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[14px] bg-[var(--chat-sidebar)] p-5 text-xl leading-8 text-[var(--chat-text)] sm:flex-row sm:items-start sm:gap-5",
        bordered && "border border-[var(--chat-border)] bg-[var(--chat-surface)]"
      )}
    >
      <div className="shrink-0 text-lg font-extrabold text-[var(--chat-text-muted)] sm:w-36">
        {label}
      </div>
      <div className="min-w-0 flex-1">{value}</div>
    </div>
  );
}

export function workspaceBadgeTone(label: string): WorkspaceBadgeTone {
  if (label === "수행기관") return "primary";
  if (label === "공익활동") return "success";
  if (label === "사회서비스형") return "info";
  if (label === "시장형사업단") return "purple";
  return "neutral";
}
