export type MockScene = {
  slug: string;
  title: string;
  description: string;
};

export const mockScenes: MockScene[] = [
  {
    slug: "chat-start",
    title: "상담 시작",
    description: "상담 진입 전 초기 상태를 확인하는 장면",
  },
  {
    slug: "character-animation",
    title: "로디 캐릭터 애니메이션",
    description: "Chat Workspace에 연결할 로디 상태 애니메이션을 확인하는 장면",
  },
  {
    slug: "profile-form",
    title: "상담 정보 입력",
    description: "생년과 거주지 입력 상태를 확인하는 장면",
  },
  {
    slug: "map-results",
    title: "기관 추천",
    description: "추천 기관을 지도 중심으로 확인하는 workspace 상태",
  },
  {
    slug: "document-references",
    title: "근거 문서 분석",
    description: "답변 근거 문서와 원문 일부를 보고서처럼 확인하는 상태",
  },
  {
    slug: "action-checklist",
    title: "실행 체크리스트",
    description: "신청 전 확인 항목과 준비 서류를 정리하는 상태",
  },
  {
    slug: "access-summary",
    title: "기관 접근 요약",
    description: "선택 기관의 위치와 예상 이동 정보를 확인하는 상태",
  },
];

export function getMockScene(slug: string) {
  return mockScenes.find((scene) => scene.slug === slug);
}
