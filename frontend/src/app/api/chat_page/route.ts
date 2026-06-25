export const runtime = "nodejs"
export const maxDuration = 60

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  })
}

export async function POST() {
  return jsonResponse(
    {
      detail: "POST /api/chat_page는 제거된 legacy JSON BFF입니다. /chat_page는 POST /api/chat을 통해 backend POST /chat/stream을 호출합니다.",
      replacement: "/api/chat",
      backendEndpoint: "/chat/stream",
    },
    { status: 410 },
  )
}
