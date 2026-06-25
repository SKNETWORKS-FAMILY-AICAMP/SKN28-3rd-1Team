import {
  DocumentTextIcon,
  ListBulletIcon,
  MapIcon,
  MapPinIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import type { DocumentSource, Institution } from "@/page/chat/data";
import { cn } from "@/lib/utils";

type ResultsTab = "map" | "list";

type ChatResultsPanelProps = {
  tab: ResultsTab;
  selectedInstitutionId: number;
  selectedDocumentId: number;
  showDocuments: boolean;
  showDocumentDetail: boolean;
  institutions: Institution[];
  documents: DocumentSource[];
  onTabChange: (tab: ResultsTab) => void;
  onSelectInstitution: (index: number) => void;
  onToggleDocuments: () => void;
  onShowDocumentDetail: (index: number) => void;
  onCloseDocumentDetail: () => void;
  onToast: (message: string) => void;
};

export function ChatResultsPanel({
  tab,
  selectedInstitutionId,
  selectedDocumentId,
  showDocuments,
  showDocumentDetail,
  institutions,
  documents,
  onTabChange,
  onSelectInstitution,
  onToggleDocuments,
  onShowDocumentDetail,
  onCloseDocumentDetail,
  onToast,
}: ChatResultsPanelProps) {
  const selected = institutions[selectedInstitutionId];
  const selectedDocument = documents[selectedDocumentId];

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-6 pb-4">
          <h1 className="text-2xl font-extrabold tracking-normal text-[var(--chat-text-strong)]">
            {showDocuments ? "상담 근거 문서" : "강남구 노인일자리 신청 가능 기관"}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--chat-text-muted)]">
            {showDocuments
              ? "추천 결과에 활용한 문서와 확인 포인트를 볼 수 있어요."
              : "지도에서 기관을 선택하면 상세 정보를 확인할 수 있어요."}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex w-max gap-1.5 rounded-xl bg-[var(--chat-sidebar-muted)] p-1">
              <TabButton
                active={tab === "map" && !showDocuments}
                icon={<MapIcon className="size-4" />}
                label="지도"
                onClick={() => onTabChange("map")}
              />
              <TabButton
                active={tab === "list" && !showDocuments}
                icon={<ListBulletIcon className="size-4" />}
                label="목록"
                onClick={() => onTabChange("list")}
              />
            </div>

            <button
              type="button"
              onClick={onToggleDocuments}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-bold transition",
                showDocuments
                  ? "border-[var(--chat-primary)] bg-[var(--chat-primary)] text-white shadow-[var(--chat-shadow-soft)]"
                  : "border-[var(--chat-border-strong)] bg-[var(--chat-panel)] text-[var(--chat-text-muted)]"
              )}
            >
              <DocumentTextIcon className="size-4" />
              {showDocuments ? "기관 보기" : "문서 레퍼런스"}
            </button>
          </div>

          {showDocuments ? (
            showDocumentDetail ? (
              <DocumentDetailPanel
                document={selectedDocument}
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onBack={onCloseDocumentDetail}
                onSelectDocument={onShowDocumentDetail}
              />
            ) : (
              <DocumentList
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={onShowDocumentDetail}
              />
            )
          ) : tab === "map" ? (
            <InstitutionMap
              institutions={institutions}
              selectedInstitutionId={selectedInstitutionId}
              onSelectInstitution={onSelectInstitution}
            />
          ) : (
            <InstitutionList
              institutions={institutions}
              selectedInstitutionId={selectedInstitutionId}
              onSelectInstitution={onSelectInstitution}
            />
          )}
        </div>

        {!showDocuments && selected ? (
          <InstitutionDetail
            institution={selected}
            index={selectedInstitutionId}
            onToast={onToast}
          />
        ) : null}
      </div>
    </section>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-[9px] px-5 py-2 text-sm font-semibold",
        active
          ? "bg-[var(--chat-panel)] text-[var(--chat-text-strong)] shadow-sm"
          : "text-[var(--chat-text-muted)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function InstitutionMap({
  institutions,
  selectedInstitutionId,
  onSelectInstitution,
}: {
  institutions: Institution[];
  selectedInstitutionId: number;
  onSelectInstitution: (index: number) => void;
}) {
  return (
    <div className="relative mt-3.5 min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-map-bg)]">
      <div className="absolute inset-0 bg-linear-to-b from-[var(--chat-map-bg)] to-[var(--chat-map-bg)]" />
      <div className="absolute -right-[4%] -top-[6%] h-[55%] w-[40%] rotate-[-8deg] rounded-bl-[60%] bg-[var(--chat-map-blue)]" />
      <div className="absolute left-[8%] top-[18%] h-[30%] w-[26%] rounded-[40%_50%_45%_55%] bg-[var(--chat-map-green)]" />
      <div className="absolute bottom-[10%] right-[14%] h-[26%] w-[22%] rounded-[55%_45%_50%_40%] bg-[var(--chat-map-green)]" />
      <div className="absolute left-0 top-[46%] h-[9px] w-full bg-[var(--chat-map-road)] shadow-sm" />
      <div className="absolute left-[38%] top-0 h-full w-[9px] bg-[var(--chat-map-road)] shadow-sm" />
      <div className="absolute left-0 top-[22%] h-[5px] w-full bg-[var(--chat-map-road-soft)]" />
      <div className="absolute left-[70%] top-0 h-full w-[5px] bg-[var(--chat-map-road-soft)]" />
      <div className="absolute left-[-10%] top-[60%] h-1.5 w-[130%] origin-left rotate-[-18deg] bg-[var(--chat-map-transit)]" />

      <span className="absolute left-[26%] top-[18%] text-[11px] text-[var(--chat-text-muted)]">
        선릉역
      </span>
      <span className="absolute left-[54%] top-[39%] text-[11px] text-[var(--chat-text-muted)]">
        강남역
      </span>
      <span className="absolute bottom-[18%] left-[22%] text-[11px] text-[var(--chat-text-muted)]">
        역삼역
      </span>

      {institutions.map((institution, index) => {
        const isSelected = index === selectedInstitutionId;
        return (
          <button
            key={institution.name}
            type="button"
            onClick={() => onSelectInstitution(index)}
            className="absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: `${institution.x}%`, top: `${institution.y}%` }}
            aria-label={institution.name}
          >
            <span
              className={cn(
                "chat-map-pin flex items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-[var(--chat-map-pin-shadow)]",
                isSelected ? "size-9 ring-[5px] ring-[var(--chat-primary-ring)]" : "size-7"
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
          </button>
        );
      })}

      <div className="absolute bottom-3 left-3 flex gap-4 rounded-[9px] bg-white/80 px-3 py-2 text-xs text-[var(--chat-text-muted)] backdrop-blur">
        {[0, 1, 2].map((tier) => (
          <span key={tier} className="flex items-center gap-1.5">
            <span
              className="chat-map-pin size-2 rounded-full"
              data-tier={tier}
            />
            {tierLabel(tier as Institution["tier"])}
          </span>
        ))}
      </div>
    </div>
  );
}

function InstitutionList({
  institutions,
  selectedInstitutionId,
  onSelectInstitution,
}: {
  institutions: Institution[];
  selectedInstitutionId: number;
  onSelectInstitution: (index: number) => void;
}) {
  return (
    <div className="mt-3.5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
      {institutions.map((institution, index) => {
        const isSelected = index === selectedInstitutionId;
        return (
          <button
            key={institution.name}
            type="button"
            onClick={() => onSelectInstitution(index)}
            className={cn(
              "rounded-[14px] border bg-[var(--chat-panel)] p-4 text-left transition",
              isSelected
                ? "border-[var(--chat-primary-border)] shadow-[var(--chat-shadow-soft)]"
                : "border-[var(--chat-border)]"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-sm font-bold text-white",
                  isSelected
                    ? "bg-[var(--chat-primary)]"
                    : "bg-[var(--chat-border-strong)]"
                )}
              >
                {index + 1}
              </span>
              <span className="text-base font-bold text-[var(--chat-text-strong)]">
                {institution.name}
              </span>
              <span className="flex-1" />
              <span className="rounded-[7px] bg-[var(--chat-sidebar-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--chat-text-muted)]">
                {tierLabel(institution.tier)}
              </span>
            </div>
            <BadgeList badges={institution.badges} />
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--chat-text-muted)]">
              <MapPinIcon className="size-4 text-[var(--chat-primary)]" />
              {institution.address}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function InstitutionDetail({
  institution,
  index,
  onToast,
}: {
  institution: Institution;
  index: number;
  onToast: (message: string) => void;
}) {
  return (
    <aside className="flex w-[312px] shrink-0 flex-col p-6 pl-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel)] p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--chat-primary)] text-sm font-bold text-white">
            {index + 1}
          </span>
          <h2 className="text-lg font-extrabold text-[var(--chat-text-strong)]">
            {institution.name}
          </h2>
        </div>

        <BadgeList badges={institution.badges} />

        <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--chat-text)]">
          <div className="flex items-center gap-2.5">
            <PhoneIcon className="size-4 text-[var(--chat-primary)]" />
            {institution.phone}
          </div>
          <div className="flex items-start gap-2.5">
            <MapPinIcon className="mt-0.5 size-4 text-[var(--chat-primary)]" />
            <span>{institution.address}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <DocumentTextIcon className="size-4 text-[var(--chat-primary)]" />
            {institution.hours}
          </div>
        </div>

        <div className="my-4 h-px bg-[var(--chat-border)]" />

        <div className="flex flex-col gap-4 text-sm leading-relaxed text-[var(--chat-text)]">
          <InfoBlock label="주요 사업" value={institution.business} />
          <InfoBlock label="신청 방법" value={institution.apply} />
          <InfoBlock label="준비 서류" value={institution.docs} />
        </div>

        <div className="flex-1" />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onToast(`전화 연결: ${institution.phone}`)}
            className="flex h-11 flex-1 items-center justify-center rounded-[11px] bg-[var(--chat-primary)] text-sm font-bold text-white shadow-[var(--chat-shadow-primary)]"
          >
            전화 문의
          </button>
          <button
            type="button"
            onClick={() => onToast(`${institution.name} 길찾기를 여는 중...`)}
            className="flex h-11 flex-1 items-center justify-center rounded-[11px] border border-[var(--chat-primary-border)] bg-[var(--chat-panel)] text-sm font-bold text-[var(--chat-primary-strong)]"
          >
            길찾기
          </button>
        </div>
      </div>
    </aside>
  );
}

function DocumentList({
  documents,
  selectedDocumentId,
  onSelectDocument,
}: {
  documents: DocumentSource[];
  selectedDocumentId: number;
  onSelectDocument: (index: number) => void;
}) {
  return (
    <div className="mt-3.5 grid min-h-0 flex-1 auto-rows-max grid-cols-1 content-start items-start gap-3 overflow-y-auto pr-1 xl:grid-cols-2">
      {documents.map((document, index) => {
        const isSelected = index === selectedDocumentId;
        return (
          <button
            key={document.title}
            type="button"
            onClick={() => onSelectDocument(index)}
            className={cn(
              "flex min-h-[210px] flex-col rounded-[14px] border bg-[var(--chat-panel)] px-4 py-3.5 text-left transition",
              isSelected
                ? "border-[var(--chat-primary-border)] shadow-[var(--chat-shadow-soft)]"
                : "border-[var(--chat-border)]"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                  isSelected
                    ? "bg-[var(--chat-primary)] text-white"
                    : "bg-[var(--chat-sidebar-muted)] text-[var(--chat-primary)]"
                )}
              >
                <DocumentTextIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-extrabold leading-snug text-[var(--chat-text-strong)]">
                  {document.title}
                </div>
                <div className="mt-1 text-xs font-semibold text-[var(--chat-text-muted)]">
                  {document.source} · {document.page}
                </div>
              </div>
              <span className="rounded-[8px] bg-[var(--chat-success-bg)] px-2.5 py-1 text-xs font-extrabold text-[var(--chat-success-text)]">
                {document.match}%
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {document.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-[var(--chat-sidebar-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--chat-text-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-2.5 line-clamp-3 text-lg leading-relaxed text-[var(--chat-text)]">
              {document.summary}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function DocumentDetailPanel({
  document,
  documents,
  selectedDocumentId,
  onBack,
  onSelectDocument,
}: {
  document: DocumentSource | undefined;
  documents: DocumentSource[];
  selectedDocumentId: number;
  onBack: () => void;
  onSelectDocument: (index: number) => void;
}) {
  if (!document) return null;

  return (
    <div className="mt-3.5 flex min-h-0 flex-1 gap-3">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel)] px-7 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--chat-primary)] text-white">
                <DocumentTextIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[30px] font-extrabold leading-tight text-[var(--chat-text-strong)]">
                  {document.title}
                </h2>
                <div className="mt-2 text-sm font-semibold text-[var(--chat-text-muted)]">
                  {document.source} · {document.updated}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="chat-badge rounded-lg px-2.5 py-1 text-xs font-semibold" data-tone="info">
                {document.category}
              </span>
              <span className="chat-badge rounded-lg px-2.5 py-1 text-xs font-semibold" data-tone="success">
                관련도 {document.match}%
              </span>
              <span className="chat-badge rounded-lg px-2.5 py-1 text-xs font-semibold" data-tone="neutral">
                {document.page}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="h-10 rounded-[10px] border border-[var(--chat-border-strong)] bg-[var(--chat-panel)] px-4 text-sm font-bold text-[var(--chat-text-muted)] transition hover:border-[var(--chat-primary-border)]"
          >
            문서 목록
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <DetailBlock label="문서 요약" value={document.summary} />
          <DetailBlock label="답변 근거 문장" value={document.citation} bordered />
        </div>

        <div className="mt-3">
          <div className="grid gap-3 lg:grid-cols-3">
            {document.highlights.map((highlight, index) => (
              <div
                key={highlight}
                className="rounded-[13px] border border-[var(--chat-border)] bg-[var(--chat-panel)] p-4"
              >
                <div className="mb-2 text-xs font-bold text-[var(--chat-primary)]">
                  근거 {index + 1}
                </div>
                <p className="text-[15px] leading-relaxed text-[var(--chat-text)]">
                  {highlight}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {document.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-[var(--chat-sidebar-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--chat-text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex-1" />
      </div>

      <aside className="flex w-[260px] shrink-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel)] p-3">
        {documents.map((item, index) => {
          const isSelected = index === selectedDocumentId;

          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onSelectDocument(index)}
              className={cn(
                "rounded-[12px] border p-3 text-left transition",
                isSelected
                  ? "border-[var(--chat-primary-border)] bg-[var(--chat-surface)] shadow-sm"
                  : "border-[var(--chat-border)] bg-[var(--chat-panel)] hover:border-[var(--chat-primary-border)]"
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-[9px]",
                    isSelected
                      ? "bg-[var(--chat-primary)] text-white"
                      : "bg-[var(--chat-sidebar-muted)] text-[var(--chat-primary)]"
                  )}
                >
                  <DocumentTextIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-extrabold leading-snug text-[var(--chat-text-strong)]">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-[var(--chat-text-muted)]">
                    {item.source} · {item.page}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </aside>
    </div>
  );
}

function BadgeList({ badges }: { badges: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge}
          className="chat-badge rounded-lg px-2.5 py-1 text-xs font-semibold"
          data-tone={badgeTone(badge)}
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-extrabold text-[var(--chat-text-muted)]">
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}

function DetailBlock({
  label,
  value,
  bordered = false,
}: {
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[14px] bg-[var(--chat-sidebar)] p-5 text-lg leading-relaxed text-[var(--chat-text)] sm:flex-row sm:items-start sm:gap-5",
        bordered && "border border-[var(--chat-border)] bg-[var(--chat-surface)]"
      )}
    >
      <div className="shrink-0 text-base font-extrabold text-[var(--chat-text-muted)] sm:w-32">
        {label}
      </div>
      <p className="min-w-0 flex-1">{value}</p>
    </div>
  );
}

function badgeTone(label: string) {
  if (label === "수행기관") return "primary";
  if (label === "공익활동") return "success";
  if (label === "사회서비스형") return "info";
  if (label === "시장형사업단") return "purple";
  return "neutral";
}

function tierLabel(tier: Institution["tier"]) {
  if (tier === 0) return "1km 이내";
  if (tier === 1) return "1~2km 이내";
  return "2km 이상";
}
