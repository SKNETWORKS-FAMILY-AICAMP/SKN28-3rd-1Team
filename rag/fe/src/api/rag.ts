import type {
  CreateDocumentIngestJobRequest,
  FileIngestStatusResponse,
  RagDocument,
  ReviewCandidateResponse,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_RAG_API_BASE_URL ?? 'http://127.0.0.1:8010'

export async function listDocuments(): Promise<RagDocument[]> {
  return request<RagDocument[]>('/api/documents')
}

export async function createIngestJob(
  payload: CreateDocumentIngestJobRequest,
): Promise<FileIngestStatusResponse> {
  return request<FileIngestStatusResponse>('/api/ingest/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function startGraphAdd(jobId: string): Promise<FileIngestStatusResponse> {
  return request<FileIngestStatusResponse>(`/api/ingest/jobs/${jobId}/start`, {
    method: 'POST',
  })
}

export async function listReviewCandidates(): Promise<ReviewCandidateResponse> {
  return request<ReviewCandidateResponse>('/api/review/edge-candidates')
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`RAG API request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}
