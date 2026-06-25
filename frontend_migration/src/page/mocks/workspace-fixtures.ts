import {
  documentSources,
  institutions,
  suggestedQuestions,
} from "@/page/chat/data";
import type {
  ChatWorkspaceMascotState,
  ChatWorkspaceState,
  WorkspaceEvidenceDocument,
  WorkspaceInstitution,
  WorkspaceMapSnapshot,
} from "@/ui/components/chat/workspace_root/workspace-state";

const institutionIds = [
  "gangnam-senior-club",
  "yeoksam-senior-welfare",
  "sinsa-community-welfare",
] as const;

const documentIds = [
  "senior-job-application-guide",
  "gangnam-agency-recruiting-notice",
  "senior-job-consulting-faq",
] as const;

const defaultMascot: ChatWorkspaceMascotState = {
  animation: "greeting",
  animationControl: "manual",
  renderer: "sprite",
};

const gangnamMapSnapshot: WorkspaceMapSnapshot = {
  center: { lat: 37.5034, lng: 127.0337 },
  landmarks: [
    {
      coordinate: { lat: 37.5045, lng: 127.049 },
      id: "seolleung-station",
      label: "선릉역",
      x: 26,
      y: 18,
    },
    {
      coordinate: { lat: 37.4979, lng: 127.0276 },
      id: "gangnam-station",
      label: "강남역",
      x: 54,
      y: 39,
    },
    {
      coordinate: { lat: 37.5006, lng: 127.0364 },
      id: "yeoksam-station",
      label: "역삼역",
      x: 22,
      y: 82,
    },
  ],
  legend: [
    { id: "near", label: "1km 이내", tier: 0 },
    { id: "middle", label: "1~2km 이내", tier: 1 },
    { id: "far", label: "2km 이상", tier: 2 },
  ],
  zoom: 14,
};

const workspaceInstitutions: WorkspaceInstitution[] = institutions.map(
  (institution, index) => ({
    ...institution,
    distanceLabel: tierLabel(institution.tier),
    id: institutionIds[index] ?? `institution-${index + 1}`,
  })
);

const workspaceDocuments: WorkspaceEvidenceDocument[] = documentSources.map(
  (document, index) => ({
    ...document,
    excerpt: document.citation,
    id: documentIds[index] ?? `document-${index + 1}`,
  })
);

const workspaceMockStates: Record<string, ChatWorkspaceState> = {
  "chat-start": {
    surface: {
      type: "default",
      mascot: defaultMascot,
      title: "안녕하세요, 로디에요",
      description: "상담을 시작하면 이 공간에 필요한 입력, 기관, 문서, 다음 행동이 차례로 열립니다.",
      statusLabel: "workspace 대기 중",
    },
  },
  "profile-form": {
    surface: {
      type: "profile-intake",
      mascot: {
        ...defaultMascot,
        animation: "attentive",
      },
      title: "상담 정보를 알려주세요",
      description:
        "태어난 년도와 사는 곳을 알려주시면 신청 조건과 가까운 기관을 더 정확히 좁힐 수 있어요.",
      fields: [
        {
          id: "birthYear",
          kind: "year",
          label: "태어난 년도",
          value: "1958",
          placeholder: "예: 1958",
        },
        {
          id: "residence",
          kind: "text",
          label: "사는 곳",
          value: "서울 강남구",
          placeholder: "예: 서울 강남구",
          span: "wide",
        },
        {
          id: "subject",
          kind: "select",
          label: "누가 겪는 일인가요?",
          value: "본인",
          placeholder: "선택하세요",
          options: [
            "본인",
            "가족",
            "근로자",
            "사업주",
            "대리인/지원자",
            "여기에 없어요",
            "아직 모르겠음",
          ],
        },
        {
          id: "goal",
          kind: "select",
          label: "필요한 정보",
          value: "지원 신청",
          placeholder: "선택하세요",
          options: [
            "지원 신청",
            "법령 확인",
            "불이익 대응",
            "서류 확인",
            "기관 문의",
            "여기에 없어요",
            "아직 모르겠음",
          ],
        },
        {
          id: "stage",
          kind: "select",
          label: "진행 단계",
          value: "신청 전",
          placeholder: "선택하세요",
          options: [
            "알아보는 중",
            "신청 전",
            "신청/처리 중",
            "거절됨",
            "분쟁 발생",
            "여기에 없어요",
            "아직 모르겠음",
          ],
        },
        {
          id: "conditions",
          kind: "textarea",
          label: "기타 정보",
          value: "기초연금 수급 중, 장시간 근무는 어려움",
          placeholder: "예: 국가유공자, 장애인 등록 완료, 근로자",
          span: "full",
        },
      ],
      primaryActionLabel: "상담 정보 반영",
      suggestedQuestions: [
        "서울 강남구에서 신청 가능한 노인일자리 알려줘",
        "1958년생도 신청 가능한 일자리 조건 알려줘",
        "가장 가까운 수행기관 알려줘",
      ],
    },
  },
  "map-results": {
    surface: {
      type: "institution-results",
      title: "강남구 노인일자리 기관 추천",
      description:
        "지도와 후보 목록을 함께 보면서 가까운 수행기관과 방문 전 확인할 정보를 좁힙니다.",
      copy: {
        headerBadge: "지도 기준",
        mapTitle: "위치 기준 보기",
        mapDescription: "거주지 주변 수행기관 후보",
        mapBadge: "지도 포함",
        listTitle: "기관 후보",
        listDescription: "거리와 사업 유형 확인",
        countSuffix: "곳",
        contactActionLabel: "전화 문의",
        directionsActionLabel: "길찾기",
      },
      institutions: workspaceInstitutions,
      map: gangnamMapSnapshot,
      selectedInstitutionId: workspaceInstitutions[0].id,
      view: "map",
    },
  },
  "document-references": {
    surface: {
      type: "evidence-documents",
      title: "근거 문서 분석",
      description:
        "답변에 활용한 문서 요약, 원문 일부, 판단 근거를 보고서처럼 확인합니다.",
      copy: {
        headerBadge: "보고서 분석",
        bundleTitle: "문서 묶음",
        bundleDescription: "답변 생성에 사용된 레퍼런스",
        summaryTitle: "문서 요약",
        citationTitle: "답변에 반영된 판단",
        excerptTitle: "원문 일부",
        highlightsTitle: "분석 메모",
        relevanceLabel: "관련도",
      },
      documents: workspaceDocuments,
      selectedDocumentId: workspaceDocuments[0].id,
      view: "detail",
    },
  },
  "action-checklist": {
    surface: {
      type: "action-checklist",
      title: "신청 전 확인할 일",
      description:
        "답변을 들은 뒤 바로 실행할 수 있는 확인 항목과 준비 서류를 정리합니다.",
      nextActionTitle: "주소 확인 필요",
      nextActionDescription:
        "가까운 복지관·주민센터의 연락처를 찾으려면 거주하시는 시·군·구 명칭을 알려 주세요.",
      nextActionLabel: "시·군·구 알려주기",
      items: [
        {
          id: "call-before-visit",
          title: "방문 전 전화로 모집 여부 확인",
          detail:
            "기관별 모집 기간과 접수 가능 시간이 다르므로 방문 전 전화 확인이 필요합니다.",
          expandedDetail:
            "전화할 때는 현재 거주지 기준 신청 가능 여부, 모집 마감일, 당일 방문 상담 가능 시간, 추가로 필요한 서류를 한 번에 확인하는 것이 좋습니다.",
          meta: "강남시니어클럽 02-123-4567",
          defaultExpanded: true,
          required: true,
          status: "ready",
          steps: [
            {
              id: "confirm-period",
              title: "모집 기간 확인",
              detail: "현재 접수 중인지, 대기 접수가 가능한지 먼저 확인합니다.",
              status: "ready",
            },
            {
              id: "confirm-slot",
              title: "상담 가능 시간 확인",
              detail: "당일 방문 상담이 가능한 시간대를 확인합니다.",
              status: "todo",
            },
          ],
        },
        {
          id: "prepare-id",
          title: "신분증과 주민등록등본 준비",
          detail:
            "기본 본인 확인과 거주지 확인에 필요한 서류를 먼저 챙깁니다.",
          expandedDetail:
            "서류는 기관별로 요구 범위가 다를 수 있으므로 원본 필요 여부와 최근 발급 기준을 전화로 확인한 뒤 준비합니다.",
          required: true,
          status: "todo",
          steps: [
            {
              id: "id-card",
              title: "신분증",
              detail: "주민등록증, 운전면허증 등 본인 확인 서류를 준비합니다.",
              status: "todo",
            },
            {
              id: "resident-copy",
              title: "주민등록등본",
              detail: "거주지 기준 접수 여부 확인에 필요할 수 있습니다.",
              status: "todo",
            },
          ],
        },
        {
          id: "check-overlap",
          title: "기존 복지 서비스와 중복 여부 확인",
          detail:
            "참여 중인 사업이나 수급 조건에 따라 일부 유형은 제한될 수 있습니다.",
          required: true,
          status: "warning",
          steps: [
            {
              id: "current-benefits",
              title: "현재 수급 중인 제도 정리",
              detail: "기초연금, 생계급여, 다른 일자리 사업 참여 이력을 메모합니다.",
              status: "warning",
            },
            {
              id: "ask-limits",
              title: "중복 제한 질문",
              detail: "기관 상담 시 중복 참여 제한 여부를 직접 확인합니다.",
              status: "todo",
            },
          ],
        },
        {
          id: "save-summary",
          title: "상담 요약 저장",
          detail:
            "기관 방문 시 상담 내용을 바로 보여줄 수 있도록 요약을 보관합니다.",
          required: false,
          status: "done",
          steps: [
            {
              id: "summary-file",
              title: "요약 저장",
              detail: "상담 요약을 저장하거나 캡처해 방문 시 보여줄 수 있게 둡니다.",
              status: "done",
            },
          ],
        },
      ],
    },
  },
  "access-summary": {
    surface: {
      type: "access-summary",
      title: "강남시니어클럽 접근 요약",
      description:
        "선택한 기관의 위치, 예상 이동 시간, 방문 전 확인 항목을 함께 봅니다.",
      copy: {
        headerBadge: "접근 요약",
        visitNotesTitle: "방문 전 확인",
        callActionLabel: "전화",
        directionsActionLabel: "길찾기",
      },
      map: gangnamMapSnapshot,
      institution: workspaceInstitutions[0],
      travel: {
        modeLabel: "대중교통 또는 도보",
        durationLabel: "약 18분",
        distanceLabel: workspaceInstitutions[0].distanceLabel,
        summary:
          "강남역 기준으로 비교적 가까운 기관입니다. 길찾기 상세 경로는 지도 앱에서 이어서 확인합니다.",
      },
      visitNotes: [
        "방문 전 운영시간과 당일 상담 가능 여부를 전화로 확인하세요.",
        "신분증, 주민등록등본, 통장사본을 기본 서류로 준비하세요.",
        "모집 기간이 끝났다면 대기 접수 가능 여부를 물어보세요.",
      ],
    },
  },
};

export function getWorkspaceMockState(slug: string) {
  return workspaceMockStates[slug] ?? null;
}

export function getWorkspaceMockQuestions(slug: string) {
  if (slug === "chat-start" || slug === "profile-form") {
    return suggestedQuestions.slice(0, 3);
  }

  return [
    "강남구에서 신청 가능한 노인일자리 알려줘",
    "가까운 수행기관과 준비 서류를 같이 알려줘",
  ];
}

function tierLabel(tier: WorkspaceInstitution["tier"]) {
  if (tier === 0) return "1km 이내";
  if (tier === 1) return "1~2km 이내";
  return "2km 이상";
}
