# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.14-alpine AS builder

ARG NEXT_PUBLIC_CHAT_API_PATH=/api/chat
ARG NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID=
ARG NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_CHAT_API_PATH=$NEXT_PUBLIC_CHAT_API_PATH \
    NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID=$NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID \
    NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=$NEXT_PUBLIC_NAVER_MAP_CLIENT_ID

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.3.14-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /app ./

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
    CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["bun", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
