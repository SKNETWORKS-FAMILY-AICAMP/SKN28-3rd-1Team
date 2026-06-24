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
    slug: "profile-form",
    title: "상담 정보 입력",
    description: "생년과 거주지 입력 상태를 확인하는 장면",
  },
  {
    slug: "map-results",
    title: "기관 지도 결과",
    description: "상담 이후 추천 기관 지도 상태를 확인하는 장면",
  },
  {
    slug: "list-results",
    title: "기관 목록 결과",
    description: "추천 기관 목록 상태를 확인하는 장면",
  },
  {
    slug: "document-references",
    title: "문서 레퍼런스",
    description: "답변 근거 문서와 인용 상태를 확인하는 장면",
  },
];

export function getMockScene(slug: string) {
  return mockScenes.find((scene) => scene.slug === slug);
}
