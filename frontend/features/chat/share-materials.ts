import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"

export type SharedInstitution = {
  name: string
  x: number
  y: number
  tier: 0 | 1 | 2
  badges: string[]
  phone: string
  address: string
  hours: string
  business: string
  apply: string
  docs: string
}

export type SharedDocument = {
  title: string
  source: string
  category: string
  page: string
  updated: string
  match: number
  tags: string[]
  summary: string
  highlights: string[]
  citation: string
}

export type MaterialsSharePayload =
  | {
      type: "materials"
      view: "institution-map" | "institution-list"
      title: string
      description: string
      selectedInstitutionId: number
      selectedInstitution: SharedInstitution
      institutions: SharedInstitution[]
    }
  | {
      type: "materials"
      view: "document-list"
      title: string
      description: string
      selectedDocumentId: number
      documents: SharedDocument[]
    }
  | {
      type: "materials"
      view: "document-detail"
      title: string
      description: string
      selectedDocumentId: number
      selectedDocument: SharedDocument
      documents: SharedDocument[]
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object"
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function parseInstitution(value: unknown): SharedInstitution | null {
  if (!isRecord(value)) return null
  const tier = value.tier

  if (
    typeof value.name !== "string" ||
    typeof value.x !== "number" ||
    typeof value.y !== "number" ||
    (tier !== 0 && tier !== 1 && tier !== 2) ||
    !isStringArray(value.badges) ||
    typeof value.phone !== "string" ||
    typeof value.address !== "string" ||
    typeof value.hours !== "string" ||
    typeof value.business !== "string" ||
    typeof value.apply !== "string" ||
    typeof value.docs !== "string"
  ) {
    return null
  }

  return {
    name: value.name,
    x: value.x,
    y: value.y,
    tier,
    badges: value.badges,
    phone: value.phone,
    address: value.address,
    hours: value.hours,
    business: value.business,
    apply: value.apply,
    docs: value.docs,
  }
}

function isSharedInstitution(value: SharedInstitution | null): value is SharedInstitution {
  return value !== null
}

function parseDocument(value: unknown): SharedDocument | null {
  if (!isRecord(value)) return null

  if (
    typeof value.title !== "string" ||
    typeof value.source !== "string" ||
    typeof value.category !== "string" ||
    typeof value.page !== "string" ||
    typeof value.updated !== "string" ||
    typeof value.match !== "number" ||
    !isStringArray(value.tags) ||
    typeof value.summary !== "string" ||
    !isStringArray(value.highlights) ||
    typeof value.citation !== "string"
  ) {
    return null
  }

  return {
    title: value.title,
    source: value.source,
    category: value.category,
    page: value.page,
    updated: value.updated,
    match: value.match,
    tags: value.tags,
    summary: value.summary,
    highlights: value.highlights,
    citation: value.citation,
  }
}

function isSharedDocument(value: SharedDocument | null): value is SharedDocument {
  return value !== null
}

export function formatMaterialsShareText(payload: MaterialsSharePayload) {
  if (payload.view === "institution-map" || payload.view === "institution-list") {
    const selected = payload.selectedInstitution
    const institutionLines = payload.institutions.map((institution, index) => `${index + 1}. ${institution.name} - ${institution.address}`)

    return [
      payload.title,
      payload.description,
      "",
      "선택 기관",
      selected.name,
      `전화: ${selected.phone}`,
      `주소: ${selected.address}`,
      `운영: ${selected.hours}`,
      `주요 사업: ${selected.business}`,
      `신청 방법: ${selected.apply}`,
      `준비 서류: ${selected.docs}`,
      "",
      "전체 기관",
      ...institutionLines,
    ].join("\n")
  }

  if (payload.view === "document-detail") {
    const document = payload.selectedDocument

    return [
      payload.title,
      payload.description,
      "",
      document.title,
      `${document.source} · ${document.page} · ${document.updated}`,
      `매칭도: ${document.match}%`,
      "",
      document.summary,
      "",
      "확인 포인트",
      ...document.highlights.map((highlight) => `- ${highlight}`),
      "",
      `인용: ${document.citation}`,
    ].join("\n")
  }

  if (payload.view === "document-list") {
    return [
      payload.title,
      payload.description,
      "",
      ...payload.documents.map(
        (document, index) =>
          `${index + 1}. ${document.title}\n${document.source} · ${document.page} · 매칭도 ${document.match}%\n${document.summary}`,
      ),
    ].join("\n\n")
  }

  return ""
}

export function createMaterialsShareData(payload: MaterialsSharePayload) {
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

export function createMaterialsShareUrl(origin: string, payload: MaterialsSharePayload) {
  const normalizedOrigin = origin.replace(/\/$/, "")
  return `${normalizedOrigin}/share#materials=${createMaterialsShareData(payload)}`
}

export function parseMaterialsShareData(data: string | null): MaterialsSharePayload | null {
  if (!data) return null

  try {
    const json = decompressFromEncodedURIComponent(data)
    if (!json) return null

    const parsed = JSON.parse(json) as Partial<MaterialsSharePayload>
    if (parsed.type !== "materials" || typeof parsed.title !== "string" || typeof parsed.description !== "string") return null

    if (parsed.view === "institution-map" || parsed.view === "institution-list") {
      const selectedInstitution = parseInstitution(parsed.selectedInstitution)
      const institutions = Array.isArray(parsed.institutions) ? parsed.institutions.map(parseInstitution).filter(isSharedInstitution) : []
      if (!selectedInstitution || institutions.length === 0 || typeof parsed.selectedInstitutionId !== "number") return null

      return {
        type: "materials",
        view: parsed.view,
        title: parsed.title,
        description: parsed.description,
        selectedInstitutionId: parsed.selectedInstitutionId,
        selectedInstitution,
        institutions,
      } satisfies MaterialsSharePayload
    }

    if (parsed.view === "document-list") {
      const documents = Array.isArray(parsed.documents) ? parsed.documents.map(parseDocument).filter(isSharedDocument) : []
      if (documents.length === 0 || typeof parsed.selectedDocumentId !== "number") return null

      return {
        type: "materials",
        view: "document-list",
        title: parsed.title,
        description: parsed.description,
        selectedDocumentId: parsed.selectedDocumentId,
        documents,
      } satisfies MaterialsSharePayload
    }

    if (parsed.view === "document-detail") {
      const selectedDocument = parseDocument(parsed.selectedDocument)
      const documents = Array.isArray(parsed.documents) ? parsed.documents.map(parseDocument).filter(isSharedDocument) : []
      if (!selectedDocument || documents.length === 0 || typeof parsed.selectedDocumentId !== "number") return null

      return {
        type: "materials",
        view: "document-detail",
        title: parsed.title,
        description: parsed.description,
        selectedDocumentId: parsed.selectedDocumentId,
        selectedDocument,
        documents,
      } satisfies MaterialsSharePayload
    }

    return null
  } catch {
    return null
  }
}
