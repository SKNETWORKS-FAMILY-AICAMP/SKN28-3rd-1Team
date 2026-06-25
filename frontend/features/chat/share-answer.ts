import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"

import type { ChatSource } from "@/features/chat/types"

export type AnswerSharePayload = {
  answer: string
  sources?: ChatSource[]
}

export function formatAnswerShareText(answer: string, sources: ChatSource[] = []) {
  const trimmedAnswer = answer.trim()
  const sourceLines = sources
    .filter((source) => source.title.trim() || source.ref.trim())
    .map((source) => `- ${source.title}${source.ref ? ` (${source.ref})` : ""}`)

  if (sourceLines.length === 0) return trimmedAnswer

  return `${trimmedAnswer}\n\n참고 자료\n${sourceLines.join("\n")}`
}

export function createAnswerShareData(payload: AnswerSharePayload) {
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

export function createAnswerShareUrl(origin: string, payload: AnswerSharePayload) {
  const normalizedOrigin = origin.replace(/\/$/, "")
  return `${normalizedOrigin}/share#data=${createAnswerShareData(payload)}`
}

export function parseAnswerShareData(data: string | null) {
  if (!data) return null

  try {
    const json = decompressFromEncodedURIComponent(data)
    if (!json) return null

    const parsed = JSON.parse(json) as Partial<AnswerSharePayload>
    if (typeof parsed.answer !== "string" || !parsed.answer.trim()) return null

    const sources = Array.isArray(parsed.sources)
      ? parsed.sources
          .filter((source): source is ChatSource => {
            if (!source || typeof source !== "object") return false
            return typeof source.title === "string" && typeof source.ref === "string"
          })
          .map((source) => ({
            title: source.title,
            ref: source.ref,
          }))
      : undefined

    return {
      answer: parsed.answer,
      ...(sources && sources.length > 0 ? { sources } : {}),
    }
  } catch {
    return null
  }
}
