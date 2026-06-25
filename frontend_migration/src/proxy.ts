import { type NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE_NAME = "skn28_demo_access";
const ACCESS_QUERY_PARAM = "demo_key";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 6;

function getDemoAccessKey() {
  return process.env.DEMO_ACCESS_KEY?.trim() ?? "";
}

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

function createAccessCookieResponse(request: NextRequest, accessKey: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.searchParams.delete(ACCESS_QUERY_PARAM);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(ACCESS_COOKIE_NAME, accessKey, {
    httpOnly: true,
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
}

export function proxy(request: NextRequest) {
  const accessKey = getDemoAccessKey();
  if (!accessKey) return NextResponse.next();

  const queryAccessKey = request.nextUrl.searchParams.get(ACCESS_QUERY_PARAM);
  if (queryAccessKey && queryAccessKey === accessKey) {
    return createAccessCookieResponse(request, accessKey);
  }

  const cookieAccessKey = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (cookieAccessKey === accessKey) return NextResponse.next();

  return createUnauthorizedResponse(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
