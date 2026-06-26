import {
  BuildingOffice2Icon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";
import {
  WorkspaceMapFrame,
  WorkspaceMapMarker,
} from "@/ui/components/chat/workspace_surface/shared/workspace-map";
import type {
  ChatWorkspaceInstitutionResultsSurface,
  WorkspaceInstitution,
} from "@/ui/components/chat/workspace_root/workspace-state";
import {
  WorkspaceBadge,
  WorkspaceInfoBlock,
  WorkspacePanel,
  workspaceBadgeTone,
} from "@/ui/components/chat/workspace_surface/shared/surface-primitives";

type InstitutionActionCopy = Pick<
  ChatWorkspaceInstitutionResultsSurface["copy"],
  "contactActionLabel" | "directionsActionLabel"
>;

export function InstitutionMap({
  institutions,
  map,
  selectedInstitutionId,
}: {
  institutions: WorkspaceInstitution[];
  map: ChatWorkspaceInstitutionResultsSurface["map"];
  selectedInstitutionId?: string;
}) {
  return (
    <WorkspaceMapFrame
      landmarks={map.landmarks}
      legend={map.legend}
      naverMap={{
        center: map.center,
        points: institutions.map((institution, index) => ({
          coordinate: institution.coordinate,
          id: institution.id,
          label: institution.name,
          markerLabel: String(index + 1),
          selected: institution.id === selectedInstitutionId,
          tier: institution.tier,
        })),
        zoom: map.zoom,
      }}
      fallbackChildren={institutions.map((institution, index) => {
        const isSelected = institution.id === selectedInstitutionId;

        return (
          <WorkspaceMapMarker
            key={institution.id}
            x={institution.x}
            y={institution.y}
          >
            <span
              className={cn(
                "chat-map-pin flex items-center justify-center rounded-full border-2 border-[var(--chat-map-pin-border)] text-base font-bold text-white shadow-[var(--chat-map-pin-shadow)]",
                isSelected
                  ? "size-10 ring-[5px] ring-[var(--chat-primary-ring)]"
                  : "size-8"
              )}
              data-tier={isSelected ? undefined : institution.tier}
              style={
                isSelected
                  ? { backgroundColor: "var(--chat-primary)" }
                  : undefined
              }
            >
              {index + 1}
            </span>
          </WorkspaceMapMarker>
        );
      })}
    />
  );
}

export function InstitutionList({
  institutions,
  selectedInstitutionId,
}: {
  institutions: WorkspaceInstitution[];
  selectedInstitutionId?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
      {institutions.map((institution, index) => {
        const isSelected = institution.id === selectedInstitutionId;

        return (
          <div
            key={institution.id}
            className={cn(
              "rounded-[15px] border bg-[var(--chat-surface)] p-3.5 transition",
              isSelected
                ? "border-[var(--chat-primary-border)] shadow-[var(--chat-shadow-soft)]"
                : "border-[var(--chat-border)]"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-base font-bold text-white",
                  isSelected
                    ? "bg-[var(--chat-primary)]"
                    : "bg-[var(--chat-border-strong)]"
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 text-lg font-extrabold leading-tight text-[var(--chat-text-strong)]">
                    {institution.name}
                  </span>
                  <WorkspaceBadge>{institution.distanceLabel}</WorkspaceBadge>
                </div>
                <BadgeList badges={institution.badges} />
                <div className="mt-3 flex items-start gap-2 text-base leading-7 text-[var(--chat-text-muted)]">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0 text-[var(--chat-primary)]" />
                  <span>{institution.address}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SelectedInstitutionSummary({
  contactActionLabel,
  directionsActionLabel,
  institution,
}: {
  institution: WorkspaceInstitution;
} & InstitutionActionCopy) {
  return (
    <WorkspacePanel className="mt-4 grid gap-4 p-5 lg:grid-cols-[minmax(280px,1.05fr)_repeat(3,minmax(0,1fr))]">
      <div className="flex min-w-0 gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--chat-primary)] text-white">
          <BuildingOffice2Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-[var(--chat-text-strong)]">
            {institution.name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {institution.badges.map((badge) => (
              <WorkspaceBadge key={badge} tone={workspaceBadgeTone(badge)}>
                {badge}
              </WorkspaceBadge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-3">
        <SummaryContact icon="phone" label="전화" value={institution.phone} />
        <SummaryContact icon="clock" label="운영시간" value={institution.hours} />
        <SummaryContact icon="map" label="주소" value={institution.address} />
      </div>

      <div className="lg:col-span-4">
        <div className="grid gap-4 border-t border-[var(--chat-border)] pt-4 lg:grid-cols-3">
          <WorkspaceInfoBlock label="주요 사업" value={institution.business} />
          <WorkspaceInfoBlock label="신청 방법" value={institution.apply} />
          <WorkspaceInfoBlock label="준비 서류" value={institution.docs} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="flex h-12 min-w-36 items-center justify-center rounded-[11px] bg-[var(--chat-primary)] px-5 text-lg font-bold text-white shadow-[var(--chat-shadow-primary)]">
            {contactActionLabel}
          </span>
          <span className="flex h-12 min-w-36 items-center justify-center rounded-[11px] border border-[var(--chat-primary-border)] bg-[var(--chat-panel)] px-5 text-lg font-bold text-[var(--chat-primary-strong)]">
            {directionsActionLabel}
          </span>
        </div>
      </div>
    </WorkspacePanel>
  );
}

function SummaryContact({
  icon,
  label,
  value,
}: {
  icon: "phone" | "clock" | "map";
  label: string;
  value: string;
}) {
  const Icon =
    icon === "phone" ? PhoneIcon : icon === "clock" ? ClockIcon : MapPinIcon;

  return (
    <div className="flex items-start gap-2 rounded-[12px] bg-[var(--chat-surface)] p-3.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--chat-primary)]" />
      <div className="min-w-0">
        <div className="text-[15px] font-extrabold text-[var(--chat-text-muted)]">
          {label}
        </div>
        <div className="mt-1 text-base font-bold leading-7 text-[var(--chat-text-strong)]">
          {value}
        </div>
      </div>
    </div>
  );
}

function BadgeList({ badges }: { badges: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <WorkspaceBadge key={badge} tone={workspaceBadgeTone(badge)}>
          {badge}
        </WorkspaceBadge>
      ))}
    </div>
  );
}
