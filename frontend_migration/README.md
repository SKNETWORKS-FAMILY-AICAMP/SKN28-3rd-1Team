# Frontend Migration

Next.js App Router 기반 프론트엔드 마이그레이션 작업 디렉토리입니다.
기존 `frontend/`와 나란히 띄워 화면과 라우트 경계를 비교하기 위해 기본 개발 포트는 `3005`를 사용합니다.

## 실행

```bash
cd frontend_migration
make start
```

기본 접속 주소:

```text
http://127.0.0.1:3005
```

기존 `frontend/`를 `3000`에서 실행한 상태로 둘 수 있습니다.

```text
기존 frontend:        http://127.0.0.1:3000
frontend_migration:  http://127.0.0.1:3005
```

## 라우트

| 경로 | 책임 |
| --- | --- |
| `/` | 로디 랜딩/시작 페이지 |
| `/chat` | canonical 상담 workspace |
| `/mocks` | 마이그레이션 목업 확인 |
| `/mocks/[scene]` | 장면별 목업 확인 |

`src/app`은 Next.js 라우팅 경계로만 유지하고, 화면 구성은 `src/page` 아래에 둡니다.

## 명령

```bash
make start    # 127.0.0.1:3005 개발 서버
make build
make preview  # 127.0.0.1:3005 production server
make lint
```

## 환경 변수

환경 변수는 `src/settings`에서 브라우저 공개 값과 BFF 서버 값을 분리해서 읽습니다.

| 변수 | 노출 범위 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CHAT_API_PATH` | browser | `/api/chat` | `/chat` 화면에서 호출할 Next.js BFF route |
| `BFF_BACKEND_BASE_URL` | server only | `http://127.0.0.1:8000` | BFF가 호출할 backend base URL |
| `BFF_BACKEND_CHAT_STREAM_PATH` | server only | `/chat/stream` | BFF가 호출할 backend chat stream path |
| `BFF_ELEVENLABS_API_KEY` | server only, sensitive | 빈 값 | BFF 소유 음성 기능에서 사용할 ElevenLabs API key 주입 지점 |

로컬 값은 `frontend_migration/.env`에 두며 git에 올리지 않습니다.
