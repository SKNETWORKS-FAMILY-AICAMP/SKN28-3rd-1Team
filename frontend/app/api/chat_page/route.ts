export const runtime = "nodejs"
export const maxDuration = 60

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000"

type ChatPageRouteRequest = {
  session_id?: string
  message?: string
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  })
}

export async function POST(request: Request) {
  let body: ChatPageRouteRequest

  try {
    body = (await request.json()) as ChatPageRouteRequest
  } catch {
    body = {}
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return jsonResponse({ detail: "message는 비어 있을 수 없습니다." }, { status: 422 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: body.session_id,
        message,
      }),
      signal: request.signal,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return jsonResponse(
        { detail: data.detail ?? `backend ${response.status}` },
        { status: response.status },
      )
    }

    return jsonResponse(data)
  } catch (error) {
    if (request.signal.aborted) {
      return jsonResponse({ detail: "요청이 취소되었습니다." }, { status: 499 })
    }

    const message = error instanceof Error ? error.message : "unknown error"
    return jsonResponse({ detail: `backend 연결 실패: ${message}` }, { status: 502 })
  }
}
