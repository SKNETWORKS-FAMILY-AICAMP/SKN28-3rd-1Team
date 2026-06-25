const DEFAULT_CHAT_API_PATH = "/api/chat";

function normalizePublicPath(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeOptionalPublicValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export const frontendSettings = {
  chatApiPath: normalizePublicPath(
    process.env.NEXT_PUBLIC_CHAT_API_PATH,
    DEFAULT_CHAT_API_PATH
  ),
  naverMapClientId:
    normalizeOptionalPublicValue(process.env.NEXT_PUBLIC_NAVER_MAP_NCP_KEY_ID) ??
    normalizeOptionalPublicValue(process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID),
} as const;
