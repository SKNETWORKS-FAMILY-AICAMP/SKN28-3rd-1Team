export interface CreateDocumentIngestJobRequest {
  file_name: string
  content: string
  content_type?: string | null
}

export interface IngestStageResult {
  stage: string
  status: string
  message: string
  path?: string | null
  error?: string | null
}

export interface FileIngestStatusResponse {
  job_id: string
  file_name: string
  current_stage: string
  completed: boolean
  stages: IngestStageResult[]
  warning?: string | null
}

export interface RagDocument {
  content: string
  source_title: string
  file_name: string
  file_type: string
  location?: string | null
  url?: string | null
  score?: number
}

export interface ReviewCandidateResponse {
  columns?: string[]
  rows?: unknown[]
  row_count?: number
  elapsed_ms?: number
}
