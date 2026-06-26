# 🧭 SKN28-3rd-1Team

> 노인·고령층이 복지·법령·지역 기관 정보를 쉽게 묻고, 근거와 다음 행동까지 확인할 수 있도록 돕는 Agentic RAG + GraphRAG 기반 상담 서비스

![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![Django Channels](https://img.shields.io/badge/Django%20Channels-Backend-0C4B33?logo=django&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-Settings-E92063?logo=pydantic&logoColor=white)
![uv](https://img.shields.io/badge/uv-Python%20Tooling-6E56CF)
![LangChain](https://img.shields.io/badge/LangChain-Agent-1C3C3C?logo=langchain&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-Orchestration-1C3C3C?logo=langchain&logoColor=white)
![OpenRouter](https://img.shields.io/badge/OpenRouter-LLM%20Gateway-111827)
![LangSmith](https://img.shields.io/badge/LangSmith-Tracing-1C3C3C?logo=langchain&logoColor=white)
![React](https://img.shields.io/badge/React-UI-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-Frontend-000000?logo=nextdotjs&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-Package-000000?logo=bun&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-Style-06B6D4?logo=tailwindcss&logoColor=white)
![Memgraph](https://img.shields.io/badge/Memgraph-GraphRAG-FF6B35?logo=memgraph&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Infra-2496ED?logo=docker&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-Collaboration-181717?logo=github&logoColor=white)
![Linear](https://img.shields.io/badge/Linear-Project%20Tracking-5E6AD2?logo=linear&logoColor=white)
![Notion](https://img.shields.io/badge/Notion-Docs-000000?logo=notion&logoColor=white)
![Discord](https://img.shields.io/badge/Discord-Communication-5865F2?logo=discord&logoColor=white)

## 1. 👥 팀 소개 및 일정 계획

### 1) 팀 소개

<table>
  <thead>
    <tr>
      <th width="8%">구분</th>
      <th width="18.4%">이원빈</th>
      <th width="18.4%">김지효</th>
      <th width="18.4%">송윤경</th>
      <th width="18.4%">전하영</th>
      <th width="18.4%">양도영</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th width="8%">사진</th>
      <td width="18.4%" align="center"><img width="90" alt="이원빈" src="https://github.com/user-attachments/assets/1d55d805-ca88-4045-870c-efcf3cd093cd" /></td>
      <td width="18.4%" align="center"><img width="100" alt="김지효" src="https://github.com/user-attachments/assets/e80bef47-6176-41c2-8471-28b5c4d14d00" /></td>
      <td width="18.4%" align="center"><img width="60" alt="송윤경" src="https://github.com/user-attachments/assets/eff9d9d9-f08c-4648-8435-0079015314b9" /></td>
      <td width="18.4%" align="center"><img width="87" alt="전하영" src="https://github.com/user-attachments/assets/6f58acc9-b043-4a64-8387-3f2d78465fda" /></td>
      <td width="18.4%" align="center"><img width="60" alt="양도영" src="https://github.com/user-attachments/assets/369cd18c-71bd-40b8-b035-70873142869c" /></td>
    </tr>
    <tr>
      <th width="8%">역할</th>
      <td width="18.4%" align="center">팀장</td>
      <td width="18.4%" align="center">RAG</td>
      <td width="18.4%" align="center">프론트엔드</td>
      <td width="18.4%" align="center">백엔드</td>
      <td width="18.4%" align="center">기획·문서</td>
    </tr>
    <tr>
      <th width="8%">한 일</th>
      <td width="18.4%">전체 일정 관리, 작업 방향 컨펌, 파트별 진행 상황 확인</td>
      <td width="18.4%">노인·고령층 관련 법령 데이터 확인, 문서 전처리와 임베딩 흐름 정리</td>
      <td width="18.4%">사용자 질문 화면 구성, API 연결 흐름 설계, 결과 화면 UX 정리, RAG 기반 테스트 케이스 설계</td>
      <td width="18.4%">Django Channels <code>/chat/stream</code> 구성, LangGraph Agent 실행 구조 정리, MCP tool 연동 준비</td>
      <td width="18.4%">전체 서비스 흐름 정리, README와 발표 자료 구성, 팀 산출물 내용 정리</td>
    </tr>
  </tbody>
</table>

### 2) 일정 계획

| 기간 | 주요 작업 | 상태 |
| --- | --- | --- |
| 2026-05-22 ~ 2026-05-26 | 주제 범위 확정, 고령층 법령 데이터 후보 정리 | 완료 |
| 2026-05-26 ~ 2026-06-02 | 초기 상담 화면 프로토타입, 상담 검색 UX, 대화형 상황 상담 화면, UI 정렬·스크롤 개선 | 완료 |
| 2026-06-04 | 프로젝트 README와 발표용 설명 문서 반복 정리 | 완료 |
| 2026-06-16 ~ 2026-06-18 | Next.js 프론트 실험, 홈·채팅 UI, Bun 기반 개발 흐름 정리 | 완료 |
| 2026-06-21 ~ 2026-06-22 | `frontend_migration/` 상담 화면 고도화, `/chat` backend 연동, 목업 페이지, 근거 문서 UI, 음성 입력 UI 정리 | 완료 |
| 2026-06-22 ~ 2026-06-24 | frontend/backend/RAG 통합 흐름 점검, 외부 지도·도구 연동 실험, 발표와 시연 산출물 정리 | 완료 |
| 2026-06-25 | 화면 제어 agent workspace command, 기관 지도·목록 연동, 실행 체크리스트, 음성/TTS 상태 UI, README 현행화 | 완료 |

## 2. 📌 프로젝트 소개

### 1) 주제

이 프로젝트는 노인과 고령층이 법률, 기초연금, 긴급복지, 고령자 고용, 근로, 지역 기관 정보를 자연어로 질문하고, 실제 공공 문서와 법령을 근거로 답변을 받을 수 있도록 만드는 RAG 기반 상담 서비스입니다.

노인복지법, 기초연금법, 고령자고용촉진 관련 법령, 근로기준법 같은 문서는 국가법령정보센터와 관련 기관 자료에 흩어져 있습니다. 또한 법률·행정 문서는 용어가 어렵고 조건이 복잡해 사용자가 본인에게 맞는 정보를 빠르게 찾기 어렵습니다.

이 서비스는 문서 검색(Retrieval), LLM 답변 생성(Generation), 화면 제어 agent, 음성 입력·답변 재생을 결합해 사용자가 이해하기 쉬운 말로 답변과 근거, 신청 절차, 주변 기관 정보를 함께 확인할 수 있도록 설계합니다.

### 2) 핵심 목표

| 목표 | 설명 |
| --- | --- |
| 문서 기반 검색 | 노인·고령층 관련 법령, 복지 안내, 행정 문서를 검색 가능한 형태로 정리합니다. |
| Agentic RAG 답변 | Main Agent가 질문 목적을 판단하고 필요한 경우 RAG/MCP Tool을 호출합니다. |
| 근거 중심 응답 | 검색 결과와 출처를 바탕으로 답변하고, 내부 id 대신 사용자가 이해할 수 있는 문서명·조문명·원문 일부를 제공합니다. |
| 상담형 workspace | Next.js `/chat`에서 채팅, 답변 스트리밍, 근거 문서, 기관 지도·목록, 실행 체크리스트, 음성 입력 흐름을 제공합니다. |
| 화면 제어 | Screen Control Agent가 최종 답변과 frontend state snapshot을 바탕으로 한 번에 하나의 workspace surface를 갱신합니다. |
| 추적 가능성 | LangSmith와 frontend trace drawer로 LLM 호출, tool calling, TTS 상태를 확인합니다. |

## 3. 🎯 해결하려는 문제

### 1) 정보 접근 문제

| 문제 | 설명 |
| --- | --- |
| 정보가 흩어져 있음 | 노인복지, 기초연금, 고령자 고용, 근로 관련 정보가 여러 기관에 나뉘어 있어 한 번에 찾기 어렵습니다. |
| 용어가 어려움 | 법령과 행정 문서는 일반 사용자가 바로 이해하기 어렵습니다. |
| 최신성이 중요함 | 연금 기준, 지원 금액, 고용 기준은 바뀔 수 있어 최신 문서 확인이 필요합니다. |
| 잘못된 답변 위험 | 복지·법률 정보는 잘못 안내되면 실제 불이익으로 이어질 수 있습니다. |

### 2) RAG가 필요한 이유

일반 LLM은 학습된 지식만으로 답변하기 때문에 최신 법령, 기초연금 신청 기준, 고령자 고용 기준을 정확히 보장하기 어렵습니다. 이 프로젝트는 실제 문서를 먼저 찾고, 그 문서를 바탕으로 답변하는 구조를 사용합니다.

## 4. 주요 사용자

### 1) 사용자 유형

| 사용자 | 필요한 정보 |
| --- | --- |
| 노인·고령층 당사자와 가족 | 기초연금, 노인복지, 신청 조건, 권리 보호 절차 |
| 복지사 및 상담 실무자 | 상담 중 빠르게 확인할 수 있는 법령, 지침, 공공 문서 근거 |
| 고령자 고용 관련 실무자 | 고령자 고용, 연령차별, 근로 기준 관련 법령 |

### 2) 질문 예시

아래 질문은 상담 답변, RAG 근거 조회, 기관·지도 화면, 음성 입력 흐름을
시연할 때 사용할 수 있는 예시입니다.

| 확인할 기능 | 예시 질문 |
| --- | --- |
| 복지 신청 절차 안내 | "긴급복지 생계지원 신청하려면 뭐부터 해야 해?" |
| 제출 서류 확인 | "기초연금 신청할 때 어떤 서류를 준비해야 해?" |
| 자격 조건 상담 | "만 65세인데 기초연금 받을 수 있는 조건을 알려줘." |
| 지역 기반 기관 안내 | "김포시에 사는데 가까운 행정복지센터를 지도에서 보여줘." |
| 기관 상세 정보 | "가까운 주민센터 전화번호랑 운영시간도 같이 알려줘." |
| 고령자 고용 법령 | "나이가 많다고 채용에서 거절당했는데 어떤 법을 확인해야 해?" |
| 근로·퇴직 상담 | "퇴직금을 못 받았을 때 어디에 상담하고 어떤 절차로 진행해야 해?" |
| 노인일자리 안내 | "노인일자리 신청은 어디에서 하고 준비할 건 뭐야?" |
| 근거 문서 확인 | "방금 답변한 내용의 근거 문서도 같이 보여줘." |
| 음성 입력 확인 | "내 말 들려?" |

## 5. 🧭 서비스 흐름

### 1) 전체 흐름

```text
사용자 질문
  -> Next.js Frontend /chat
  -> Next.js Route Handler /api/chat
  -> Backend Django ASGI /chat/stream SSE
  -> LangGraph Main Agent
  -> RAG MCP Tool / External MCP Tool
  -> Memgraph 기반 문서 검색 또는 외부 정보 조회
  -> Main Agent 최종 답변 생성
  -> Speech Text Agent / ElevenLabs TTS
  -> Screen Control Agent workspace command
  -> 채팅 답변, 음성, 근거·지도·체크리스트 화면 표시
```

### 2) 역할 분리

| 영역 | 역할 |
| --- | --- |
| Frontend | `frontend_migration/`의 Next.js App Router 상담 화면. `/chat`에서 sidebar chat, workspace surface, 근거 문서, 기관 지도, 음성 입력, trace drawer를 제공합니다. |
| Frontend BFF | `/api/chat`에서 backend SSE를 AI SDK `UIMessage` stream/data part로 변환하고 TTS audio part를 전달합니다. |
| Backend | Django ASGI API 서버와 LangGraph Agent Orchestrator 역할 |
| Screen Control Agent | 최종 답변과 frontend state snapshot을 보고 typed workspace command를 생성합니다. |
| Speech/TTS | Speech Text Agent가 음성용 문장을 정리하고 ElevenLabs TTS node가 오디오 chunk를 stream합니다. |
| RAG Backend | Backend 내부 모듈이 아닌 별도 서비스로 동작하며 문서 ingest, 검색 API, MCP endpoint 제공 |
| External MCP | Naver, Firecrawl, TMAP 등 외부 정보를 MCP tool 형태로 제공 |
| Memgraph | GraphRAG 검색을 위한 그래프 데이터 저장 |

### 3) 아키텍처 원칙

| 원칙 | 설명 |
| --- | --- |
| 영역 분리 | Frontend, Backend, RAG를 독립된 영역으로 나누어 책임을 분리합니다. |
| 컨테이너 기반 실행 | 각 영역은 독립적인 Docker Container로 구성하고, 전체 실행은 Docker Compose로 묶는 방향입니다. |
| Main Agent 중심 | Backend의 Main Agent가 사용자 요청을 판단하고 답변 흐름을 조율합니다. |
| MCP Tool 호출 | Main Agent는 RAG 내부 구현을 직접 알지 않고 MCP Tool 형태로 검색 기능을 호출합니다. |
| Typed Workspace Command | Backend agent가 raw JSX나 endpoint를 직접 보내지 않고, BFF와 frontend가 검증 가능한 typed command/state만 주고받습니다. |
| 단일 화면 전환 | Screen Control Agent는 한 번에 하나의 surface만 갱신해 사용자 화면이 급하게 여러 번 바뀌지 않도록 합니다. |
| GraphRAG 확장 | RAG 영역은 문서 검색뿐 아니라 Memgraph 기반 관계 검색까지 확장할 수 있도록 설계합니다. |

## 6. ✨ 주요 기능

### 1) 사용자 기능

| 기능 | 설명 |
| --- | --- |
| 자연어 상담 | 사용자가 어려운 법률 용어 없이 질문할 수 있습니다. |
| 스트리밍 답변 | `/chat` sidebar에서 backend SSE 응답을 AI SDK UI message stream으로 받아 단계적으로 표시합니다. |
| 근거 문서 제공 | 답변과 함께 관련 법령, 문서, 출처, 확인 포인트를 오른쪽 자료 영역에서 확인합니다. |
| 기관 정보 UI | 지역 기반 상담 결과를 Naver 지도·목록·상세 카드 형태로 확인하고, 목록 선택 시 지도 포커스와 상세 정보가 함께 갱신됩니다. |
| 실행 체크리스트 | 신청 절차, 필수·선택 항목, 다음 행동 버튼을 accordion 형태로 확인할 수 있습니다. |
| 음성 입력 | 고령층 사용자가 마이크로 질문을 입력할 수 있고, 입력·듣는 중·생각 중·답변 중 로디 애니메이션이 상태별로 표시됩니다. |
| 음성 답변 | Speech Text Agent와 ElevenLabs TTS stream으로 답변을 들을 수 있습니다. |
| 문서 검색 | 공공 문서와 법령을 기반으로 관련 정보를 찾습니다. |
| 추가 판단 요소 안내 | 조건이 부족하면 추가 확인이 필요한 부분을 안내합니다. |

### 2) 개발 기능

| 기능 | 설명 |
| --- | --- |
| Next.js BFF `/api/chat` | frontend가 호출하는 route handler이며 backend `POST /chat/stream` SSE를 AI SDK `UIMessage` stream/data part로 변환합니다. |
| Django ASGI `/chat/stream` | backend의 canonical streaming chat endpoint입니다. |
| LangGraph Agent | `session_id` 기반으로 대화 흐름을 이어갈 수 있도록 구성합니다. |
| LLM Provider | agent별 `LLM_AGENT_<AGENT>_*` 설정으로 OpenRouter/Cerebras 계열 provider와 model을 선택합니다. |
| RAG MCP Tool | 법률·행정 문서 검색 기능을 Agent tool로 연결합니다. |
| External MCP Tool | Naver, Firecrawl, TMAP 기반 위치·웹 검색·길찾기 기능을 MCP tool로 확장합니다. |
| Workspace Command Schema | backend Pydantic schema와 frontend Zod schema로 화면 command 계약을 검증합니다. |
| Main Agent Tool Indicator | 메인 채팅 bubble에서 Main Agent tool call 발생 여부를 확인할 수 있습니다. |
| LangSmith | LLM 호출과 tool calling trace를 검증합니다. |

## 7. ✅ 현재 구현 상태

### 1) 완료 및 진행 현황

| 영역 | 상태 |
| --- | --- |
| Frontend `/chat` | `frontend_migration/`의 현재 active 상담 화면입니다. 왼쪽 sidebar chat, backend stream 연동, 오른쪽 workspace surface, 음성 입력, trace drawer를 제공합니다. |
| Frontend workspace | 기본 로디 화면, 프로필 입력, 기관 지도·목록, 근거 문서, 실행 체크리스트, 접근 요약 surface를 제공합니다. |
| Frontend mocks | `/mocks`와 `/mocks?scene=...`에서 상담 시작, 캐릭터 애니메이션, 지도 결과, 문서 레퍼런스, 체크리스트 등 장면별 디자인을 확인할 수 있습니다. |
| Backend `/chat/stream` API | Django Channels에서 사용자 메시지를 받아 LangGraph Agent 답변을 SSE stream으로 반환합니다. |
| Next.js BFF `/api/chat` | backend SSE event를 AI SDK `UIMessage` stream/data part로 변환해 `/chat`에 전달합니다. |
| LLM Provider 연동 | `LLM_AGENT_<AGENT>_PROVIDER` 설정으로 agent별 LLM provider와 model을 선택합니다. |
| LangGraph Agent | `ChatThreadContextStore`와 `InMemorySaver` 기반 session/thread 처리를 사용합니다. |
| Screen Control Agent | final response 중심으로 한 번에 하나의 workspace surface만 선택하고, action checklist/detail/map state를 command로 갱신합니다. |
| Speech/TTS | 브라우저 음성 dictation, Speech Text Agent, ElevenLabs TTS stream, 로디 상태 애니메이션을 연결했습니다. |
| Trace/Tool Indicator | Agent trace drawer와 Main Agent tool call badge로 tool 호출 여부를 확인할 수 있습니다. |
| LangSmith 검증 | LLM 호출 trace와 mock tool call trace를 확인했습니다. |
| RAG Backend | 문서 ingest, 검색 API, read-only MCP endpoint 구조가 있습니다. |
| RAG Frontend | 문서 목록, ingest job, review queue를 확인하는 운영 UI가 있습니다. |
| External MCP | Naver, Firecrawl, TMAP 등 외부 도구 연동을 위한 FastMCP provider tool 구조가 있습니다. |

### 2) 남은 작업

| 작업 | 설명 |
| --- | --- |
| 근거 품질 고도화 | 답변에서 내부 id를 숨기고 사용자가 이해할 수 있는 문서명, 조문명, 원문 일부 중심으로 출처를 계속 정리합니다. |
| Frontend 실사용 검증 | `/chat`의 상담 플로우, 음성 입력, 문서 근거 UI, 지도·체크리스트, 모바일·반응형 동작을 실제 시나리오로 확인합니다. |
| 평가 데이터 확장 | `presentation/test-data`의 벤치마크와 LLM-as-a-judge 결과를 기준으로 실패 케이스를 계속 보강합니다. |
| 운영 안정화 | Docker Compose 통합 실행, health check, UI 반응형 검증을 반복해 시연 환경을 안정화합니다. |
| 배포 정리 | Next.js frontend, backend, RAG 운영 UI의 공개 범위와 배포 절차를 확정합니다. |

## 8. 기술 스택

### 1) 사용 기술

| 영역 | 사용 기술 |
| --- | --- |
| Backend | ![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white) ![Django Channels](https://img.shields.io/badge/Django%20Channels-ASGI-0C4B33?logo=django&logoColor=white) ![Pydantic](https://img.shields.io/badge/Pydantic-Settings-E92063?logo=pydantic&logoColor=white) ![uv](https://img.shields.io/badge/uv-Package-6E56CF) |
| Agent | ![LangChain](https://img.shields.io/badge/LangChain-Agent-1C3C3C?logo=langchain&logoColor=white) ![LangGraph](https://img.shields.io/badge/LangGraph-Flow-1C3C3C?logo=langchain&logoColor=white) ![OpenRouter](https://img.shields.io/badge/OpenRouter-LLM-111827) ![LangSmith](https://img.shields.io/badge/LangSmith-Trace-1C3C3C?logo=langchain&logoColor=white) |
| RAG | ![MCP](https://img.shields.io/badge/MCP-Tool%20Server-111827) ![Memgraph](https://img.shields.io/badge/Memgraph-Graph%20DB-FF6B35?logo=memgraph&logoColor=white) ![Neo4j](https://img.shields.io/badge/Neo4j-Compatible-4581C3?logo=neo4j&logoColor=white) ![GraphRAG](https://img.shields.io/badge/GraphRAG-Search-10B981) |
| Frontend | ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black) ![Next.js](https://img.shields.io/badge/Next.js-App-000000?logo=nextdotjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-TS-3178C6?logo=typescript&logoColor=white) ![Bun](https://img.shields.io/badge/Bun-Package-000000?logo=bun&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-Style-06B6D4?logo=tailwindcss&logoColor=white) ![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Components-000000?logo=shadcnui&logoColor=white) |
| Deploy | ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white) ![Memgraph Lab](https://img.shields.io/badge/Memgraph%20Lab-Graph%20View-FF6B35?logo=memgraph&logoColor=white) ![Make](https://img.shields.io/badge/Make-Workflow-111827) |
| Collaboration | ![GitHub](https://img.shields.io/badge/GitHub-Code-181717?logo=github&logoColor=white) ![Linear](https://img.shields.io/badge/Linear-Issues-5E6AD2?logo=linear&logoColor=white) ![Notion](https://img.shields.io/badge/Notion-Docs-000000?logo=notion&logoColor=white) ![Discord](https://img.shields.io/badge/Discord-Chat-5865F2?logo=discord&logoColor=white) |

## 9. 📁 프로젝트 구조

### 1) Repository Structure

```text
SKN28-3rd-1Team/
├── backend/                 # Django Channels 기반 Agent Orchestrator
│   ├── src/django_backend/  # /health, /chat/stream HTTP/SSE transport
│   ├── src/api/             # backend support package
│   ├── src/agents/          # Main Agent, LLM provider, tools
│   ├── src/graph/           # chat turn stream runner
│   ├── src/memory/          # conversation id, checkpointer, TTL boundary
│   ├── src/nodes/           # speech/TTS node
│   └── src/agents/*/*.j2    # agent별 prompt
├── rag/
│   ├── be/                  # RAG backend, ingest, search, MCP endpoint
│   ├── fe/                  # RAG 운영 UI
│   ├── infra/               # Memgraph, Memgraph Lab 실행 설정
│   ├── RAG_ORIGINAL_DATA/   # RAG 대상 원본 JSON 데이터
│   ├── RAG_PREPROCESSED_DATA/ # RAG 입력용 TOON 전처리 데이터
│   ├── related/             # 루트에서 이동한 RAG 관련 실험/작업 공간
│   └── docs/                # RAG 설계 문서
├── external_mcp/            # Naver / Firecrawl / TMAP FastMCP provider tools
├── frontend_migration/      # 현재 active Next.js App Router 상담 UI
│   ├── src/app/             # route boundary, /chat, /api/chat, /mocks
│   ├── src/page/chat/       # chat page controller, BFF stream orchestration
│   ├── src/page/mocks/      # full-size workspace scene fixture
│   ├── src/ui/components/   # chat sidebar, workspace surface, mascot UI
│   └── public/              # mascot sprite, static assets
├── docs/                    # 회의록, 온보딩, 개발 문서
├── presentation/            # 발표 스크립트, PPT/PDF, 평가 데이터 산출물
│   ├── ppt/                 # 발표 자료, 스크립트, Memgraph Lab 시연 캡처
│   ├── deploy/              # AWS 배포/CI-CD 발표용 Mermaid, Eraser 다이어그램
│   ├── outputs/             # 발표 자료 생성/검증 산출물
│   ├── test-data/           # benchmark, LLM-as-a-judge 결과
│   └── marking_criteria/    # 프로젝트 평가 기준 정리
├── deploy/                  # 통합 배포 실행 설정
│   ├── aws/                 # ECR/CodeBuild/CodePipeline/ECS 배포 준비 파일
│   ├── docker/              # Docker Compose와 deploy env 파일
│   └── makefile/            # 통합 실행 Makefile
├── .agents/                 # repo-scoped agent skill과 작업 규칙
├── AGENTS.md                # 협업 및 agent 작업 규칙
└── README.md
```

### 2) 주요 문서

| 문서 | 설명 |
| --- | --- |
| `frontend_migration/README.md` | 현재 active Next.js `/chat`, `/api/chat`, workspace, 목업, env 안내 |
| `backend/README.md` | Backend Agent 구조, `/chat/stream` SSE API, MCP 연결 위치 |
| `rag/README.md` | RAG 서브시스템 전체 구조 |
| `rag/be/README.md` | RAG Backend API, MCP endpoint, 환경 변수 |
| `rag/fe/README.md` | RAG 운영 UI 실행 방법 |
| `external_mcp/README.md` | Naver / Firecrawl / TMAP MCP tool 서버와 환경 변수 |
| `deploy/README.md` | local dev 통합 Makefile, Docker Compose, AWS 배포 준비 정보 |
| `docs/README.md` | agent guideline, 온보딩, 도구 설정 등 팀 문서 |
| `docs/legacy/llm_env_naming_convention.md` | LLM agent/provider/model env naming과 Infisical 동기화 기준 |
| `presentation/deploy/README.md` | AWS 배포/CI-CD 발표용 Mermaid, Eraser 다이어그램 원본 |
| `presentation/test-data/README.md` | 발표용 평가 데이터, benchmark, judge 결과 구조 |

### 3) 발표 및 시연 산출물

| 산출물 | 설명 |
| --- | --- |
| [`presentation/ppt/옆집 손주_찐최종 (1).pdf`](<presentation/ppt/옆집 손주_찐최종 (1).pdf>) | 최종 발표 PDF |
| [`presentation/ppt/reviewable-graphrag-service-presentation-v4.pptx`](presentation/ppt/reviewable-graphrag-service-presentation-v4.pptx) | 검토 가능한 최신 PPTX 발표 자료 |
| [`presentation/ppt/20min-presentation-script-v4.md`](presentation/ppt/20min-presentation-script-v4.md) | 20분 발표 스크립트 |
| [`presentation/ppt/artifact-build-manifest.json`](presentation/ppt/artifact-build-manifest.json) | 발표 자료 생성과 검증 산출물 manifest |
| `presentation/ppt/assets/` | Memgraph Lab graph, schema, query 결과 시연 캡처 |

## 10. 🚀 실행 방법

### 1) Frontend + Backend local dev 실행

현재 active 상담 UI는 `frontend_migration/`의 `/chat`입니다. 통합 Makefile의 `make dev`는 `frontend_migration/`과 backend를 함께 띄웁니다.

```bash
cd deploy/makefile
make dev
```

기본 접속 정보:

```text
Frontend:    http://127.0.0.1:3005
Backend API: http://127.0.0.1:8000
```

현재 active `/chat` 화면을 실행할 때는 아래 target을 사용합니다.

```bash
cd frontend_migration
make start
```

기본 접속 정보:

```text
Frontend Migration: http://127.0.0.1:3005
Chat:               http://127.0.0.1:3005/chat
Mocks:              http://127.0.0.1:3005/mocks
```

frontend/backend 개별 실행이 필요하면 아래 target을 사용합니다.

```bash
cd deploy/makefile
make fe   # frontend_migration local dev
make be   # backend local dev
```

`make dev`, `make fe`, `make be`는 RAG, Memgraph, Redis, `external_mcp` 서비스를 자동으로 띄우지 않는다. `make dev`는 frontend/backend 병렬 실행 전에 backend env-check를 먼저 수행한다. 포트를 바꿔야 하면 `FRONTEND_PORT` 또는 `BACKEND_PORT`를 지정한다.

```bash
make dev FRONTEND_PORT=3001 BACKEND_PORT=8100
```

### 2) 통합 Docker Compose 실행

Frontend, Backend, RAG Backend, RAG Frontend, Memgraph, Memgraph Lab, Redis를
같은 `deploy_default` Docker network에서 함께 실행해야 할 때만 명시적인
compose target을 사용한다.

```bash
cd deploy/makefile
make compose-up
```

기본 접속 정보:

```text
Frontend:      http://127.0.0.1:3000
Backend API:   http://127.0.0.1:8100
RAG Backend:   http://127.0.0.1:8110
RAG Frontend:  http://127.0.0.1:5174
Memgraph Lab:  http://127.0.0.1:3001
Memgraph Bolt: bolt://127.0.0.1:7687
Redis:         redis://127.0.0.1:6379/0
```

Docker network 내부 연결:

```text
backend -> http://rag-be:8010/mcp/
rag-be -> bolt://memgraph:7687
rag-be -> redis://redis:6379/0
```

`/chat/stream`은 실제 LLM provider 호출이므로 `deploy/docker/.env_backend`에
선택한 provider의 `LLM_PROVIDER_*_API_KEY`가 유효해야 한다.

Makefile target이 있는 서비스는 `make`를 우선 사용한다. Python 서비스의
`make start`, `make test`, `make check` 계열 target은 먼저 `uv sync`를 실행해
서비스 로컬 `.venv`를 준비한 뒤 `uv run`으로 실행한다. 현재 scope의 Python
venv는 `backend/.venv`와 `rag/be/.venv`이며, repository root Python을
current scope 작업에 사용하지 않는다.

### 3) Backend Agent 실행

```bash
cd backend
make start
```

상태 확인:

```bash
curl -s http://127.0.0.1:8000/health | python -m json.tool
```

채팅 API 테스트:

```bash
curl -N http://127.0.0.1:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"session_id":"readme-test-1","message":"안녕. 너는 어떤 일을 할 수 있어?"}'
```

### 4) RAG Infra 실행

```bash
cd rag
make infra-up
```

기본 접속 정보:

```text
Memgraph Bolt: bolt://127.0.0.1:7687
Memgraph Lab:  http://127.0.0.1:3000
```

### 5) RAG Backend / MCP 실행

```bash
cd rag
make be-start
```

주요 endpoint:

```text
GET  /health
POST /ingest
POST /search
GET  /api/documents
POST /api/documents/search
GET  /api/review/edge-candidates
MCP  /mcp
```

MCP client가 사용할 기본 endpoint:

```text
http://127.0.0.1:8010/mcp/
```

### 6) External MCP 실행

```bash
cd external_mcp
make sync
make test
make start
```

MCP Inspector 또는 backend tool 연결에서 사용할 기본 endpoint:

```text
http://127.0.0.1:8020/
```

### 7) RAG Frontend 실행

```bash
cd rag
make fe-start
```

기본 접속:

```text
http://127.0.0.1:5173
```

## 11. 🧪 검증 방법

### 1) Frontend Migration

```bash
cd frontend_migration
make lint
make build
```

주요 수동 확인 경로:

```text
http://127.0.0.1:3005/chat
http://127.0.0.1:3005/mocks?scene=map-results
http://127.0.0.1:3005/mocks?scene=action-checklist
http://127.0.0.1:3005/mocks?scene=character-animation
```

### 2) Backend

```bash
cd backend
make check
make test
```

### 3) RAG Backend

```bash
cd rag
make be-check
```

### 4) RAG Frontend

```bash
cd rag
make fe-check
```

### 5) External MCP

```bash
cd external_mcp
make test
make check
```

## 12. 🔐 환경 변수 관리

### 1) 관리 원칙

- 실제 `.env` 파일은 Git에 올리지 않습니다.
- `.env.schema`가 env field의 버전 관리 기준입니다.
- API key, token, password 같은 secret 값은 Infisical에서 관리합니다.
- 환경별로 달라지는 non-secret runtime config도 active service가 실제로 읽는 값이면 Infisical plain config로 중앙 관리할 수 있습니다.
- env를 직접 확인해야 할 때는 local `.env`를 읽지 말고 `varlock load --agent`로 redacted 상태만 확인합니다.
- Makefile target이 Infisical/Varlock을 지원하는 경우 `make env-check`로 provider 주입과 schema 계약을 검증합니다.
- env var, Infisical, Varlock, LLM provider/model 이름을 바꿀 때는 `AGENTS.md`의 `env-var-governance` skill과 `docs/legacy/llm_env_naming_convention.md`를 먼저 확인합니다.

### 2) 서비스별 환경 파일

| 서비스 | Schema | 주요 값 |
| --- | --- | --- |
| Shared | `.env.schema` | `APP_ENV` |
| Frontend Migration | `frontend_migration/.env.schema` | BFF backend URL, Naver map public key, demo access, TTS BFF key |
| Backend | `backend/.env.schema` | LLM provider API key, CORS, RAG MCP URL |
| External MCP | `external_mcp/.env.schema` | Naver/Firecrawl/TMAP API key, External MCP endpoint |
| Deploy | `deploy/docker/.env.schema` | 통합 Docker Compose host 포트, public build args |
| AWS Deploy | `deploy/aws/buildspec.yml` | backend, frontend_migration, external_mcp ECR image build/push와 ECS image definition artifact |
| RAG Backend | `rag/be/.env.schema` | Memgraph 연결, MCP endpoint, 외부 API key |
| RAG Frontend | `rag/fe/.env.schema` | RAG API base URL |
| RAG Infra | `rag/infra/.env.schema` | Memgraph 포트, Lab 포트 |

`.env.example`은 active env 계약으로 사용하지 않습니다. 새 env field 변경은 해당 서비스의 `.env.schema`를 먼저 수정합니다.

Backend는 `make env-check`와 `make start`에서 Infisical CLI로 provider 값을 주입하고 Varlock으로 schema 계약을 검증합니다. 다른 서비스도 provider 연결 시 같은 흐름을 따릅니다.

Python 가상환경은 서비스별 `.venv`만 사용합니다. `backend/`와 `rag/be/`에서
`make start`, `make test`, `make check`를 실행하면 필요한 경우 `uv sync`가
먼저 실행되어 `.venv`가 생성됩니다. `.venv/`와 실제 `.env` 파일은 Git에
올리지 않습니다.

## 13. 🤝 협업 방식

### 1) 작업 관리

| 도구 | 사용 목적 |
| --- | --- |
| GitHub | 코드 관리, PR, 리뷰 |
| Linear | 파트별 일정과 이슈 관리 |
| Notion | 회의 내용, 기획 문서, 프로젝트 정리 |
| Discord | 실시간 소통 |

### 2) Git 규칙

- `main` 브랜치에 직접 push하지 않습니다.
- 기능, 수정, 문서 작업은 별도 브랜치에서 진행합니다.
- PR에는 변경 요약, 테스트 결과, 영향 디렉터리, 환경 변수 변경 여부를 기록합니다.
- 상세 작업 규칙은 `AGENTS.md`와 `docs/agent_guidelines/agent_workspace_guidelines.md`를 따릅니다.

## 14. 📝 한 줄 정리

### 1) 프로젝트 요약

이 프로젝트는 흩어진 노인·고령층 관련 복지·법령·지역 기관 정보를 RAG와 MCP tool로 확인하고, Agent가 근거 기반 답변·음성 안내·지도/체크리스트 화면까지 함께 제공하는 상담 서비스입니다.
