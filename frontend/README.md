# Frontend

노인·고령층 법률·복지 상담 서비스의 Next.js 기반 프론트엔드입니다.
현재 화면은 mock 답변 데이터(`lib/mock-legal.ts`)를 사용하므로 별도 API key 없이 실행할 수 있습니다.

## Prerequisites

- Node.js 20.9.0 이상
- Bun 1.3 이상
- Make
- Git

## 처음 pull 받은 뒤 실행

```bash
git pull
cd frontend
make start
```

기본 접속 주소:

```text
http://127.0.0.1:3000
```

Next.js가 `0.0.0.0:3000` 바인딩 권한 문제를 내거나 Turbopack 캐시 오류가 나면 webpack 모드로 실행합니다.

```bash
bun run dev -- --webpack -H 127.0.0.1
```

포트 3000을 이미 사용 중이면 다른 포트를 지정합니다.

```bash
bun run dev -- --webpack -H 127.0.0.1 -p 3001
```

이 경우 접속 주소는 `http://127.0.0.1:3001`입니다.

## 실행 확인

브라우저에서 아래 페이지가 열리면 정상입니다.

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/chat
```

터미널로 확인할 수도 있습니다.

```bash
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:3000/chat
```

두 요청 모두 `HTTP/1.1 200 OK`가 나오면 서버가 응답하고 있는 상태입니다.

## 개발 명령

```bash
# 개발 서버
make start

# 프로덕션 빌드
make build

# 빌드 결과 실행
make preview

# 린트
make lint
```

## 환경 파일

현재는 mock 데이터 기반 화면이라 필수 환경 변수가 없습니다.

로컬에서만 쓰는 환경 파일은 Git에 올리지 않습니다.

```text
.env
.env.local
env.development.local
.env.development.local
.env.test.local
.env.production.local
```

새 환경 변수가 필요해지면 `frontend/.env.example`을 추가하고 이 README에 값을 설명합니다.

## 문제 해결

### `next: Permission denied`

`node_modules` 실행 파일 권한이 깨진 경우입니다. 보통 lockfile 기준으로 다시 설치하면 해결됩니다.

```bash
rm -rf node_modules
bun install
```

### `Cannot find module 'next/dist/compiled/commander'`

의존성 설치가 불완전한 상태입니다.

```bash
bun install
```

### `listen EPERM: operation not permitted 0.0.0.0:3000`

localhost만 사용하도록 host를 지정합니다.

```bash
bun run dev -- -H 127.0.0.1
```

### `Failed to open database` 또는 Turbopack persistence 오류

Turbopack 캐시 문제일 수 있습니다. webpack 모드로 우회합니다.

```bash
bun run dev -- --webpack -H 127.0.0.1
```

필요하면 `.next` 캐시를 지운 뒤 다시 실행합니다.

```bash
rm -rf .next
bun run dev -- --webpack -H 127.0.0.1
```
