import "server-only";

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_BACKEND_CHAT_STREAM_PATH = "/chat/stream";

function readOptionalEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function readEnv(name: string, fallback: string) {
  return readOptionalEnv(name) || fallback;
}

function normalizePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_BACKEND_CHAT_STREAM_PATH;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export const bffSettings = {
  backendBaseUrl: trimTrailingSlash(
    readEnv("BFF_BACKEND_BASE_URL", DEFAULT_BACKEND_BASE_URL)
  ),
  backendChatStreamPath: normalizePath(
    readEnv("BFF_BACKEND_CHAT_STREAM_PATH", DEFAULT_BACKEND_CHAT_STREAM_PATH)
  ),
  elevenLabsApiKey: readOptionalEnv("BFF_ELEVENLABS_API_KEY"),
} as const;

export function getBackendChatStreamUrl() {
  return `${bffSettings.backendBaseUrl}${bffSettings.backendChatStreamPath}`;
}
