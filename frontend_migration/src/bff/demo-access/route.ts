import { NextResponse } from "next/server";

import {
  DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS,
  DEMO_ACCESS_COOKIE_NAME,
  getDemoAccessKey,
  shouldUseSecureDemoCookie,
} from "./session";

const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_LOCKOUT_SECONDS = 10 * 60;

type AttemptState = {
  count: number;
  lockedUntil: number;
};

const attempts = new Map<string, AttemptState>();

function readPositiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
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

function sanitizeNextPath(value: unknown) {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed;
}

function getRequestProtocol(request: Request) {
  return (
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    new URL(request.url).protocol.replace(":", "")
  );
}

function createLockedResponse(lockedUntil: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: "demo_access_locked",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

function recordFailedAttempt(clientKey: string) {
  const maxFailures = readPositiveInteger("DEMO_ACCESS_MAX_FAILURES", DEFAULT_MAX_FAILURES);
  const lockoutSeconds = readPositiveInteger("DEMO_ACCESS_LOCKOUT_SECONDS", DEFAULT_LOCKOUT_SECONDS);
  const now = Date.now();
  const current = attempts.get(clientKey);
  const nextCount = current && current.lockedUntil <= now ? current.count + 1 : 1;

  if (nextCount >= maxFailures) {
    const lockedUntil = now + lockoutSeconds * 1000;
    attempts.set(clientKey, { count: nextCount, lockedUntil });
    return { lockedUntil, remainingAttempts: 0 };
  }

  attempts.set(clientKey, { count: nextCount, lockedUntil: 0 });
  return { lockedUntil: 0, remainingAttempts: maxFailures - nextCount };
}

export async function handleDemoAccessPost(request: Request) {
  const accessKey = getDemoAccessKey();
  if (!accessKey) {
    return NextResponse.json({ ok: true, nextPath: "/" });
  }

  const clientKey = getClientKey(request);
  const now = Date.now();
  const current = attempts.get(clientKey);
  if (current?.lockedUntil && current.lockedUntil > now) {
    return createLockedResponse(current.lockedUntil);
  }

  let body: { password?: unknown; nextPath?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const password = typeof body.password === "string" ? body.password : "";
  const nextPath = sanitizeNextPath(body.nextPath);

  if (password !== accessKey) {
    const failed = recordFailedAttempt(clientKey);
    if (failed.lockedUntil) return createLockedResponse(failed.lockedUntil);

    return NextResponse.json(
      {
        error: "invalid_demo_access",
        remainingAttempts: failed.remainingAttempts,
      },
      { status: 401 }
    );
  }

  attempts.delete(clientKey);

  const response = NextResponse.json({ ok: true, nextPath });
  response.cookies.set(DEMO_ACCESS_COOKIE_NAME, accessKey, {
    httpOnly: true,
    maxAge: DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureDemoCookie(getRequestProtocol(request)),
  });

  return response;
}
