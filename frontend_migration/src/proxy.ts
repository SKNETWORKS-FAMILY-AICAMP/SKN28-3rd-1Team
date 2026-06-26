import { type NextRequest, NextResponse } from "next/server";

import {
  DEMO_ACCESS_COOKIE_NAME,
  isDemoAccessCookieValid,
  isDemoAccessEnabled,
} from "@/bff/demo-access/session";

const PUBLIC_PATHS = new Set(["/demo-access", "/api/demo-access"]);

function createUnauthorizedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "demo_access_required" },
      { status: 401 }
    );
  }

  return new NextResponse("Demo access required.", {
    status: 401,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function createLoginRedirect(request: NextRequest) {
  const loginUrl = new URL("/demo-access", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  if (!isDemoAccessEnabled()) return NextResponse.next();

  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const cookieAccessKey = request.cookies.get(DEMO_ACCESS_COOKIE_NAME)?.value;
  if (isDemoAccessCookieValid(cookieAccessKey)) return NextResponse.next();

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return createLoginRedirect(request);
  }

  return createUnauthorizedResponse(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
