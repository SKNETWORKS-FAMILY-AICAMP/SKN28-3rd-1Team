import {
  BuildingOffice2Icon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import {
  WorkspaceMapFrame,
  WorkspaceMapMarker,
} from "@/ui/components/chat/workspace_surface/shared/workspace-map";
import type {
  ChatWorkspaceAccessSummarySurface,
  WorkspaceAccessTravel,
  WorkspaceInstitution,
} from "@/ui/components/chat/workspace_root/workspace-state";
import {
  WorkspaceBadge,
  WorkspaceInfoBlock,
  WorkspacePanel,
  workspaceBadgeTone,
} from "@/ui/components/chat/workspace_surface/shared/surface-primitives";

type AccessCopy = ChatWorkspaceAccessSummarySurface["copy"];

export function AccessMap({
  institution,
  map,
}: {
  institution: WorkspaceInstitution;
  map: ChatWorkspaceAccessSummarySurface["map"];
}) {
  return (
    <WorkspaceMapFrame
      className="min-h-[340px] rounded-2xl border border-[var(--chat-border)]"
      landmarks={map.landmarks}
      legend={map.legend}
      naverMap={{
        center: map.center ?? institution.coordinate,
        points: [
          {
            coordinate: institution.coordinate,
            id: institution.id,
            label: institution.name,
            markerLabel: "1",
            selected: true,
            tier: institution.tier,
          },
        ],
        zoom: map.zoom,
      }}
      fallbackChildren={
        <WorkspaceMapMarker x={institution.x} y={institution.y}>
          <span className="chat-map-pin flex size-10 items-center justify-center rounded-full border-2 border-white bg-[var(--chat-primary)] text-sm font-bold text-white shadow-[var(--chat-map-pin-shadow)] ring-[5px] ring-[var(--chat-primary-ring)]">
            1
          </span>
        </WorkspaceMapMarker>
      }
    >
      <WorkspacePanel className="absolute bottom-4 left-4 max-w-[360px] p-4 shadow-[var(--chat-shadow-soft)]">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-[var(--chat-primary)] text-white">
            <BuildingOffice2Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-[var(--chat-text-strong)]">
              {institution.name}
            </div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--chat-text-muted)]">
              {institution.distanceLabel}
            </div>
          </div>
        </div>
      </WorkspacePanel>
    </WorkspaceMapFrame>
  );
}

export function AccessDetail({
  copy,
  institution,
  travel,
  visitNotes,
}: {
  copy: AccessCopy;
  institution: WorkspaceInstitution;
  travel: WorkspaceAccessTravel;
  visitNotes: string[];
}) {
  return (
    <WorkspacePanel className="flex min-h-0 flex-col overflow-y-auto p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--chat-primary)] text-white">
          <TruckIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[30px] font-extrabold leading-tight text-[var(--chat-text-strong)]">
            {travel.durationLabel}
          </h2>
          <p className="mt-2 text-lg leading-8 text-[var(--chat-text-muted)]">
            {travel.summary}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-lg">
        <AccessMetric
          icon={<TruckIcon className="size-4" />}
          label="이동수단"
          value={travel.modeLabel}
        />
        <AccessMetric
          icon={<ClockIcon className="size-4" />}
          label="예상 시간"
          value={travel.durationLabel}
        />
        <AccessMetric
          icon={<MapPinIcon className="size-4" />}
          label="거리"
          value={travel.distanceLabel}
        />
      </div>

      <div className="my-4 h-px bg-[var(--chat-border)]" />

      <div className="flex flex-col gap-4">
        <WorkspaceInfoBlock label="전화" value={institution.phone} />
        <WorkspaceInfoBlock label="주소" value={institution.address} />
        <WorkspaceInfoBlock label="운영시간" value={institution.hours} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {institution.badges.map((badge) => (
          <WorkspaceBadge key={badge} tone={workspaceBadgeTone(badge)}>
            {badge}
          </WorkspaceBadge>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-3 text-lg font-extrabold text-[var(--chat-text-muted)]">
          {copy.visitNotesTitle}
        </div>
        <div className="flex flex-col gap-2">
          {visitNotes.map((note) => (
            <div
              key={note}
              className="rounded-[12px] border border-[var(--chat-border)] bg-[var(--chat-panel)] p-4 text-lg leading-8 text-[var(--chat-text)]"
            >
              {note}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />
      <div className="mt-5 flex gap-2">
        <span className="flex h-12 flex-1 items-center justify-center rounded-[11px] bg-[var(--chat-primary)] text-lg font-bold text-white shadow-[var(--chat-shadow-primary)]">
          <PhoneIcon className="mr-2 size-5" />
          {copy.callActionLabel}
        </span>
        <span className="flex h-12 flex-1 items-center justify-center rounded-[11px] border border-[var(--chat-primary-border)] bg-[var(--chat-panel)] text-lg font-bold text-[var(--chat-primary-strong)]">
          {copy.directionsActionLabel}
        </span>
      </div>
    </WorkspacePanel>
  );
}

function AccessMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[11px] border border-[var(--chat-border)] bg-[var(--chat-surface)] px-4 py-3">
      <span className="flex items-center gap-2 text-[var(--chat-text-muted)]">
        {icon}
        {label}
      </span>
      <span className="font-bold text-[var(--chat-text-strong)]">{value}</span>
    </div>
  );
}
