# Frontend Migration

Next.js App Router 기반 프론트엔드 마이그레이션 작업 디렉토리입니다.
기존 `frontend/`와 나란히 띄워 화면과 라우트 경계를 비교하기 위해 기본 개발 포트는 `3005`를 사용합니다.

## 실행

```bash
cd frontend_migration
bun install
bun dev
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
bun dev      # 127.0.0.1:3005 개발 서버
bun run build
bun start    # 127.0.0.1:3005 production server
bun run lint
```
