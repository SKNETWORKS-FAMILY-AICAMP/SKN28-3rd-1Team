# ⚙️ Backend

FastAPI 기반 메인 백엔드이다.

- frontend는 `rag/`를 직접 호출하지 않는다. 프론트는 `backend`만 호출한다. 
- backend는 질문 흐름, 세션, 파일 업로드, RAG 검색 연결, LLM 답변 생성을 담당한다.

## 🎯 핵심 역할

- `POST /api/chat`: 질문, 보기 선택, 기타 입력, 후속 질문 처리
- `GET /api/chat/mock`: front 결과 화면용 mock 응답 반환
- `POST /api/files/upload`: 파일 업로드 후 RAG ingest 요청
- `GET /api/files/{job_id}/status`: 파일 처리 상태 조회
- `src/prompt/*.md`: LLM 답변 흐름과 출력 원칙 정의
- `src/schemas/*.py`: API 요청/응답 schema 정의
- `src/mock/chat_response.json`: front 연결용 샘플 응답

## 🗂️ 구조

```text
backend/                              # backend 루트
├── README.md                         # 안내 문서
├── pyproject.toml                    # 의존성 설정
├── .env.example                      # 환경 변수 예시
│ 
├── scripts/                          # 테스트 스크립트
│   └── manual_chat.py                # 터미널 대화 테스트
│ 
└── src/                              # 앱 코드
    ├── app.py                        # 앱 시작점
    ├── settings.py                   # 설정 로딩
    ├── session_store.py              # 세션 저장
    ├── file_store.py                 # 파일 저장
    ├── rag_ingest_client.py          # RAG ingest 호출
    │ 
    ├── api/                          # API 라우터
    │   ├── chat.py                   # 채팅 API
    │   └── files.py                  # 파일 API
    │ 
    ├── agent/                        # 답변 로직
    │   ├── graph.py                  # 질문 처리 흐름
    │   └── openrouter_llm.py         # LLM 연결
    │ 
    ├── prompt/                       # 프롬프트
    │   ├── clarification_system.md   # 보기 생성 규칙
    │   ├── clarification_human.md    # 보기 생성 입력
    │   ├── grounded_answer_system.md # 답변 생성 규칙
    │   └── grounded_answer_human.md  # 답변 생성 입력
    │ 
    ├── schemas/                      # 데이터 계약
    │   ├── chat.py                   # 채팅 schema
    │   └── files.py                  # 파일 schema
    │ 
    └── mock/                         # mock 응답
        ├── chat.py                   # mock 검증
        └── chat_response.json        # mock JSON
```

## 🧩 Prompt, Schema, Mock

| 위치 | 의미 |
| --- | --- |
| `src/prompt/*.md` | LLM에게 답변 방식 지시 |
| `src/schemas/*.py` | frontend와 맞출 데이터 계약 |
| `src/mock/chat_response.json` | frontend가 받을 응답 예시 |

즉, 답변 흐름은 prompt에 둔다. frontend 연결 검증은 mock JSON으로 한다.

## 💬 Chat Flow


```text
[사용자]
  기본정보 입력
  첫 번째 질문
      |
      v
[backend]
  기본정보 세션 저장
  LLM에 보기 생성 요청
      |
      v
[LLM]
  보기 3개 생성
      |
      v
[backend]
  clarification 응답 반환
      |
      v
[사용자]
  보기 선택 또는 기타 입력
      |
      v
[backend]
  RAG 검색
      |
      v
[LLM]
  RAG 근거 기반 답변 생성
      |
      v
[backend]
  answer 응답 반환
  - 답변
  - 출처
  - 관련 문서
  - confidence
  - evidence_status
      |
      v
[사용자]
  다음 행동 선택
  1. 후속 질문
  2. 새 질문
  3. 사용자 정보 다시 입력
  4. 이전 보기로 돌아가기
  5. 종료
```

| 단계 | 사용자 | backend | LLM | RAG |
| --- | --- | --- | --- | --- |
| 1 | 기본정보 입력 |  |  |  |
| 2 | 첫 번째 질문 |  |  |  |
| 3 |  | 기본정보 세션 저장 |  |  |
| 4 |  | 보기 생성 요청 | 보기 3개 생성 |  |
| 5 |  | `clarification` 응답 반환 |  |  |
| 6 | 보기 선택 또는 기타 입력 |  |  |  |
| 7 |  | 검색 요청 |  | 관련 문서 검색 |
| 8 |  | 답변 생성 요청 | RAG 근거 기반 답변 생성 |  |
| 9 |  | `answer` 응답 반환 |  |  |
| 10 | 다음 행동 선택 |  |  |  |
| 11 | 후속 질문 선택 | 이전 대화 포함 검색 | 답변 생성 | 관련 문서 검색 |
| 12 | 새 질문 선택 | 새 질문 흐름 시작 |  |  |
| 13 | 사용자 정보 다시 입력 | 기본정보 갱신 |  |  |
| 14 | 이전 보기로 돌아가기 | 직전 `clarification` 보기 재사용 |  |  |


기본정보는 나이, 지역, 소득, 가구원 수 등을 뜻한다. 미입력 시, 질문만으로 진행한다.
LLM 보기 생성 실패 시, backend가 기본 보기 3개를 반환한다.

답변 뒤 메뉴:

| 번호 | 선택 | 흐름 |
| --- | --- | --- |
| 1 | 후속 질문 | 기존 세션과 이전 대화 이어서 질문 |
| 2 | 새 질문 | 같은 사용자 정보로 새 질문 시작 |
| 3 | 사용자 정보 다시 입력 | 기본정보 갱신 후 질문 |
| 4 | 이전 보기로 돌아가기 | 직전 보기 3개 다시 선택 |
| 5 | 종료 | 터미널 테스트 종료 |

이전 보기가 없으면 4번은 종료로 표시된다.

`kind` 기준으로 frontend 화면을 나눈다.

| kind | frontend 화면 |
| --- | --- |
| `clarification` | 보기 3개, 기타 입력 |
| `answer` | 답변, 출처, 관련 문서, 신뢰도, 근거 상태 |

`clarification`은 아직 검색 결과가 아니다. 그래서 `confidence`는 `null`, `evidence_status`는 `not_applicable`이다.

프론트는 `kind === "answer"`일 때만 근거 상태를 표시한다.

## 🔌 Chat API

### POST `/api/chat`

최초 질문 예시:

```json
{
  "question": "수원시 노인일자리 신청방법이 궁금해요",
  "user_profile": {
    "age": 72,
    "location": {
      "city": "경기도",
      "district": "수원시"
    }
  }
}
```

보기 선택 예시:

```json
{
  "session_id": "처음 응답에서 받은 session_id",
  "question": "수원시 노인일자리 신청방법이 궁금해요",
  "selected_option": {
    "id": "1",
    "title": "신청 절차",
    "search_focus": "수원시 노인일자리 신청 절차와 방법"
  }
}
```

기타 입력 예시:

```json
{
  "session_id": "처음 응답에서 받은 session_id",
  "question": "수원시 노인일자리 신청방법이 궁금해요",
  "custom_intent": "담당부서 문의처 중심으로 찾아줘"
}
```

후속 질문 예시:

```json
{
  "session_id": "처음 응답에서 받은 session_id",
  "question": "그럼 어디에 문의하면 돼?",
  "is_follow_up": true
}
```

`selected_option`과 `custom_intent`는 동시에 보내지 않는다. 동시에 보내면 400 오류이다.

### GET `/api/chat/mock`

front 결과 화면 연결용 endpoint이다. LLM이나 RAG 서버를 호출하지 않는다.

```bash
curl -s http://127.0.0.1:8001/api/chat/mock
```

mock 응답은 `src/mock/chat_response.json`에 있다. 
`src/mock/chat.py`가 `ChatResponse` schema로 검증한다.

## 📦 ChatResponse 핵심 필드

| 필드 | 의미 |
| --- | --- |
| `summary` | 답변 요약 |
| `details` | 상세 설명 |
| `laws` | 관련 법령, 조항 |
| `sources` | 화면용 출처 문자열 |
| `references` | 상세 출처, 파일명, URL, 원문 발췌, score |
| `eligibility` | 자격 가능성 판단 |
| `confidence` | 답변 신뢰도, 0~1 |
| `evidence_status` | 근거 상태 |
| `warning` | 확인 필요 메시지 |
| `options` | clarification 보기 3개 |
| `allow_custom_input` | 기타 입력 허용 여부 |

## 🧭 evidence_status

| 값 | 의미 |
| --- | --- |
| `not_applicable` | 판단 대상 아님. 주로 `clarification` |
| `sufficient` | 근거 충분 |
| `insufficient` | 검색 결과 없음 또는 근거 부족 |
| `rag_error` | RAG 검색 실패 |
| `llm_fallback` | 문서는 찾았지만 LLM 답변 생성 실패 |

## 📁 File Upload Flow

```text
1. 프론트가 파일 업로드
2. backend가 로컬 저장
3. backend가 RAG /ingest 호출
4. 프론트가 job_id로 상태 조회
5. indexed면 다음 검색부터 포함
```

### POST `/api/files/upload`

```bash
curl -s http://127.0.0.1:8001/api/files/upload \
  -F "file=@./sample.md"
```

### GET `/api/files/{job_id}/status`

```bash
curl -s http://127.0.0.1:8001/api/files/{job_id}/status
```

처리 단계:

- `uploaded`
- `parsed`
- `converted`
- `stored`
- `indexed`
- `failed`

현재 RAG 지원 파일:

- `.csv`
- `.json`
- `.py`
- `.txt`
- `.md`

PDF, DOCX, HWP 파싱은 후속 작업이다.

## 🔐 환경 변수

`.env`는 `backend/.env`에 둔다. 커밋하지 않는다.

```bash
cp .env.example .env
```

주요 값:

| 변수 | 기본값 |
| --- | --- |
| `BACKEND_API_PORT` | `8000` |
| `BACKEND_OPENROUTER_MODEL` | `openai/gpt-oss-120b` |
| `BACKEND_RAG_INGEST_URL` | `http://127.0.0.1:8010/ingest` |
| `BACKEND_RAG_INGEST_STATUS_URL` | `http://127.0.0.1:8010/ingest/status` |
| `BACKEND_RAG_SEARCH_URL` | `http://127.0.0.1:8010/search` |
| `BACKEND_RAG_SEARCH_TOP_K` | `5` |

## 🚀 실행

의존성 설치:

```bash
cd backend
uv sync
```

RAG 서버:

```bash
cd rag
PYTHONPATH=src uv run uvicorn app:app --host 127.0.0.1 --port 8011
```

backend 서버:

```bash
cd backend
BACKEND_RAG_SEARCH_URL=http://127.0.0.1:8011/search \
BACKEND_RAG_INGEST_URL=http://127.0.0.1:8011/ingest \
BACKEND_RAG_INGEST_STATUS_URL=http://127.0.0.1:8011/ingest/status \
PYTHONPATH=src uv run uvicorn app:app --host 127.0.0.1 --port 8001
```

상태 확인:

```bash
curl -s http://127.0.0.1:8001/health
```

## ✅ 검증

컴파일 확인:

```bash
cd backend
uv run python -m compileall src scripts
```

mock, schema, clarification 기본값 확인:

```bash
cd backend
PYTHONPATH=src uv run python - <<'PY'
from fastapi.testclient import TestClient
from app import app
from mock.chat import create_mock_chat_response
from schemas.chat import ChatResponse, ResponseKind, EvidenceStatus

mock = create_mock_chat_response()
assert mock.kind == ResponseKind.ANSWER
assert mock.sources
assert mock.references
assert mock.confidence is not None
assert mock.evidence_status == EvidenceStatus.SUFFICIENT

clarification = ChatResponse(
    kind=ResponseKind.CLARIFICATION,
    summary="질문 범위를 먼저 좁혀 주세요.",
)
assert clarification.confidence is None
assert clarification.evidence_status == EvidenceStatus.NOT_APPLICABLE

client = TestClient(app)
response = client.get("/api/chat/mock")
assert response.status_code == 200

print("completion criteria validation: ok")
PY
```

## ⚠️ 주의

- 세션 저장소는 메모리 기반이다. 서버 재시작 시 사라진다.
- RAG ingest 상태도 현재 메모리 기반이다.
- 운영 단계에서는 Redis/DB, 인증, 파일 크기 제한, 악성 파일 검사 필요하다.
- mock은 front 연결 확인용이다. 실제 답변은 `/api/chat` 흐름을 사용한다.
