export type Institution = {
  coordinate: {
    lat: number;
    lng: number;
  };
  name: string;
  x: number;
  y: number;
  tier: 0 | 1 | 2;
  badges: string[];
  phone: string;
  address: string;
  hours: string;
  business: string;
  apply: string;
  docs: string;
};

export type DocumentSource = {
  title: string;
  source: string;
  category: string;
  page: string;
  updated: string;
  match: number;
  tags: string[];
  summary: string;
  highlights: string[];
  citation: string;
};

export const institutions: Institution[] = [
  {
    name: "강남시니어클럽",
    coordinate: { lat: 37.5012, lng: 127.0385 },
    x: 54,
    y: 48,
    tier: 0,
    badges: ["수행기관", "공익활동", "사회서비스형"],
    phone: "02-123-4567",
    address: "서울특별시 강남구 선릉로 123길 45",
    hours: "평일 09:00 - 18:00",
    business:
      "노인일자리 및 사회활동 지원사업 운영 (공익활동, 사회서비스형, 시장형)",
    apply: "방문 접수 또는 전화 문의 후 상담",
    docs: "신분증, 주민등록등본, 통장사본 등",
  },
  {
    name: "역삼노인종합복지관",
    coordinate: { lat: 37.4939, lng: 127.0333 },
    x: 40,
    y: 67,
    tier: 1,
    badges: ["수행기관", "공익활동"],
    phone: "02-234-5678",
    address: "서울특별시 강남구 역삼로 200",
    hours: "평일 09:00 - 18:00",
    business: "노인 공익활동형 일자리 운영 및 지역사회 참여 지원",
    apply: "복지관 방문 접수 후 상담 진행",
    docs: "신분증, 주민등록등본",
  },
  {
    name: "신사종합사회복지관",
    coordinate: { lat: 37.5172, lng: 127.0206 },
    x: 30,
    y: 38,
    tier: 2,
    badges: ["수행기관", "시장형사업단"],
    phone: "02-345-6789",
    address: "서울특별시 강남구 압구정로 50",
    hours: "평일 09:00 - 17:00",
    business: "시장형사업단(카페, 매장 등) 운영 및 일자리 연계",
    apply: "전화 예약 후 방문 상담",
    docs: "신분증, 통장사본",
  },
];

export const documentSources: DocumentSource[] = [
  {
    title: "노인일자리 사업 신청 안내",
    source: "공공 신청 안내 자료",
    category: "신청 자격",
    page: "p. 6-9",
    updated: "2026.01",
    match: 94,
    tags: ["참여 조건", "신청 절차", "준비 서류"],
    summary:
      "만 60세 이상 또는 사업 유형별 참여 가능 연령, 신청 전 확인해야 할 소득·건강보험 기준, 접수 순서를 정리한 문서예요.",
    highlights: [
      "신분증과 주민등록등본을 기본 서류로 확인",
      "지역 수행기관 상담 후 세부 사업 배정",
      "사업 유형별 참여 조건이 다를 수 있음",
    ],
    citation:
      "신청자는 주소지 기준 수행기관에서 상담을 먼저 받고, 사업 유형에 맞는 서류를 준비합니다.",
  },
  {
    title: "강남구 수행기관 모집 공고 예시",
    source: "지자체 공고 참고 자료",
    category: "지역 기관",
    page: "p. 2-4",
    updated: "2026.02",
    match: 88,
    tags: ["강남구", "수행기관", "접수처"],
    summary:
      "강남구 안에서 상담과 접수를 맡는 수행기관 목록, 연락처, 방문 접수 기준을 화면 결과와 함께 확인하기 위한 자료예요.",
    highlights: [
      "기관별 운영 시간이 달라 방문 전 전화 확인 필요",
      "거주지와 가까운 기관부터 상담 권장",
      "모집 기간 종료 후 대기 접수가 될 수 있음",
    ],
    citation:
      "모집 기관은 접수 기간, 사업 유형, 배정 인원에 따라 신청 가능 여부가 달라집니다.",
  },
  {
    title: "노인일자리 상담 FAQ",
    source: "상담 응대 참고 자료",
    category: "자주 묻는 질문",
    page: "Q3-Q6",
    updated: "2025.12",
    match: 81,
    tags: ["FAQ", "나이 기준", "중복 참여"],
    summary:
      "처음 신청하는 사용자가 자주 묻는 나이 조건, 다른 복지 서비스와의 중복 가능 여부, 접수 후 진행 절차를 요약했어요.",
    highlights: [
      "기초 정보 확인 후 상담 질문을 구체화",
      "사업별 중복 참여 제한 여부 확인",
      "접수 후 선발 결과 안내까지 시간이 걸릴 수 있음",
    ],
    citation:
      "처음 신청하는 경우에도 상담자가 거주지와 생년 정보를 기준으로 가능한 사업을 안내할 수 있습니다.",
  },
];

export const suggestedQuestions = [
  "기초연금 신청 방법과 준비 서류를 알려줘",
  "65세 이상 노인이 받을 수 있는 혜택은?",
  "노인일자리 신청은 어디에서 하나요?",
  "나이 때문에 채용에서 차별받았어요",
  "퇴직금을 못 받았을 때 어떻게 하나요?",
];
