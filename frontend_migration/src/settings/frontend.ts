const DEFAULT_CHAT_API_PATH = "/api/chat";

function normalizePublicPath(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export const frontendSettings = {
  chatApiPath: normalizePublicPath(
    process.env.NEXT_PUBLIC_CHAT_API_PATH,
    DEFAULT_CHAT_API_PATH
  ),
} as const;
