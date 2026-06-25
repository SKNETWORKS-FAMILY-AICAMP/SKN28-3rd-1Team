import "server-only";

const DEFAULT_CHAT_RATE_LIMIT_PER_MINUTE = 20;
const WINDOW_MS = 60_000;

type RateLimitBucket = {
  count: number;
  windowStart: number;
};

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

const buckets = new Map<string, RateLimitBucket>();

function readLimit() {
  const configured = Number(process.env.DEMO_CHAT_RATE_LIMIT_PER_MINUTE);
  if (!Number.isFinite(configured)) return DEFAULT_CHAT_RATE_LIMIT_PER_MINUTE;
  return Math.max(0, Math.floor(configured));
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  return (
    forwardedIp ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.windowStart > WINDOW_MS * 2) buckets.delete(key);
  }
}

export function checkDemoChatRateLimit(request: Request): RateLimitResult {
  const limit = readLimit();
  if (limit === 0) return { allowed: true };

  const now = Date.now();
  pruneExpiredBuckets(now);

  const key = getClientKey(request);
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}
