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
| `/mocks` | full-size 마이그레이션 목업 viewer |
| `/mocks?scene=...` | 목업 viewer의 scene 선택 상태 |
| `/mocks/[scene]` | legacy scene URL redirect |

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
| `NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID` | browser | 빈 값 | workspace 지도에 사용할 Naver Cloud Platform Maps Web Dynamic Map key ID |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | browser | 빈 값 | 이전 Naver Maps client id alias. 신규 설정은 `NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID`를 우선 사용 |
| `BFF_BACKEND_BASE_URL` | server only | `http://127.0.0.1:8000` | BFF가 호출할 backend base URL |
| `BFF_BACKEND_CHAT_STREAM_PATH` | server only | `/chat/stream` | BFF가 호출할 backend chat stream path |
| `BFF_ELEVENLABS_API_KEY` | server only, sensitive | 빈 값 | BFF 소유 음성 기능에서 사용할 ElevenLabs API key 주입 지점 |
| `DEMO_ACCESS_KEY` | server only, sensitive | 빈 값 | 설정되면 `/demo-access` 비밀번호 통과 후 데모 화면과 API를 사용할 수 있음 |
| `DEMO_ACCESS_MAX_FAILURES` | server only | `5` | 비밀번호 임시 잠금 전 실패 허용 횟수 |
| `DEMO_ACCESS_LOCKOUT_SECONDS` | server only | `600` | 비밀번호 실패 잠금 시간 |

로컬 값은 `frontend_migration/.env`에 두며 git에 올리지 않습니다.
