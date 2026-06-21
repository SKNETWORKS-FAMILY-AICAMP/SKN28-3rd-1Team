export const runtime = "nodejs"
export const maxDuration = 60

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000"

type ChatAudioRouteRequest = {
  session_id?: string | null
  turn_id?: string | null
  text?: string
}

export async function POST(request: Request) {
  let body: ChatAudioRouteRequest

  try {
    body = (await request.json()) as ChatAudioRouteRequest
  } catch {
    body = {}
  }

  const text = String(body.text ?? "").trim()
  if (!text) {
    return Response.json({ detail: "음성으로 만들 텍스트가 없습니다." }, { status: 400 })
  }

  const backendResponse = await fetch(`${BACKEND_URL}/chat/audio/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      session_id: body.session_id,
      turn_id: body.turn_id,
      answer: text,
    }),
    signal: request.signal,
  })

  if (!backendResponse.ok || !backendResponse.body) {
    return Response.json(
      { detail: `음성 생성 서버에 연결하지 못했어요. (backend ${backendResponse.status})` },
      { status: backendResponse.status || 502 },
    )
  }

  return new Response(backendResponse.body, {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  })
}
