import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpenText,
  Check,
  Clock3,
  Database,
  FilePlus2,
  GitBranch,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react'
import {
  createIngestJob,
  listDocuments,
  listReviewCandidates,
  startGraphAdd,
} from './api/rag'
import { Metric } from './components/Metric'
import { AddDocumentModal } from './features/documents/AddDocumentModal'
import type {
  FileIngestStatusResponse,
  RagDocument,
  ReviewCandidateResponse,
} from './types'

type StatusKind = 'idle' | 'loading' | 'success' | 'error'

const seedJobs: FileIngestStatusResponse[] = [
  {
    job_id: 'sample-law-001',
    file_name: '근로기준법_raw.json',
    current_stage: 'indexed',
    completed: true,
    stages: [
      {
        stage: 'stored',
        status: 'success',
        message: 'Stored document in the RAG input directory.',
      },
      {
        stage: 'indexed',
        status: 'success',
        message: 'Document is available to the current text loader.',
      },
    ],
  },
]

const navigationItems = [
  { label: 'Documents', icon: BookOpenText },
  { label: 'Graph Jobs', icon: GitBranch },
  { label: 'Review Queue', icon: Clock3 },
  { label: 'Memgraph', icon: Database },
]

function App() {
  const [documents, setDocuments] = useState<RagDocument[]>([])
  const [jobs, setJobs] = useState<FileIngestStatusResponse[]>(seedJobs)
  const [review, setReview] = useState<ReviewCandidateResponse | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusKind>('idle')
  const [message, setMessage] = useState('Ready')

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return documents
    }
    return documents.filter((document) =>
      `${document.source_title} ${document.file_name} ${document.content}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [documents, query])

  const latestJob = jobs[0]
  const pendingReviewCount = review?.row_count ?? 0

  async function refresh() {
    setStatus('loading')
    try {
      const [documentResponse, reviewResponse] = await Promise.allSettled([
        listDocuments(),
        listReviewCandidates(),
      ])

      if (documentResponse.status === 'fulfilled') {
        setDocuments(documentResponse.value)
      }
      if (reviewResponse.status === 'fulfilled') {
        setReview(reviewResponse.value)
      }

      if (documentResponse.status === 'rejected' && reviewResponse.status === 'rejected') {
        setMessage('Backend unavailable')
        setStatus('error')
        return
      }

      setMessage('Synced')
      setStatus(documentResponse.status === 'fulfilled' ? 'success' : 'error')
    } catch {
      setMessage('Backend unavailable')
      setStatus('error')
    }
  }

  async function handleCreateJob(fileName: string, content: string) {
    setStatus('loading')
    const job = await createIngestJob({ file_name: fileName, content })
    setJobs((current) => [job, ...current.filter((item) => item.job_id !== job.job_id)])
    setModalOpen(false)
    setMessage('Document staged')
    setStatus('success')
    await refresh()
  }

  async function handleStartGraphAdd(jobId: string) {
    setStatus('loading')
    const job = await startGraphAdd(jobId)
    setJobs((current) => [job, ...current.filter((item) => item.job_id !== job.job_id)])
    setMessage('Graph add requested')
    setStatus('success')
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#18202f]">
      <div className="grid min-h-screen grid-cols-[240px_1fr_320px] max-xl:grid-cols-[220px_1fr] max-lg:grid-cols-1">
        <aside className="border-r border-[#d9dee8] bg-white px-4 py-5 max-lg:border-b max-lg:border-r-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#263247] text-white">
              <BookOpenText size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-5">RAG Library</p>
              <p className="text-xs text-[#667085]">Memgraph GraphRAG</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navigationItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-[#344054] hover:bg-[#eef2f7]"
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 px-6 py-5 max-sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Document Workspace</h1>
              <p className="text-sm text-[#667085]">{message}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd6e4] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f2f4f7]"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f7a5f] px-3 text-sm font-semibold text-white hover:bg-[#17614c]"
              >
                <FilePlus2 size={17} />
                Add Document
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
            <Metric label="Documents" value={documents.length} icon={<BookOpenText size={18} />} />
            <Metric label="Jobs" value={jobs.length} icon={<GitBranch size={18} />} />
            <Metric label="Pending" value={pendingReviewCount} icon={<Clock3 size={18} />} />
            <Metric
              label="Backend"
              value={status === 'loading' ? 'Sync' : status === 'error' ? 'Down' : 'Ready'}
              icon={
                status === 'loading' ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : status === 'error' ? (
                  <AlertCircle size={18} />
                ) : (
                  <Check size={18} />
                )
              }
            />
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-md border border-[#cfd6e4] bg-white px-3 py-2">
            <Search size={17} className="text-[#667085]" />
            <input
              name="document-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="Search stored documents"
            />
          </div>

          <div className="mt-4 grid gap-3">
            {filteredDocuments.length === 0 ? (
              <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-[#b8c0cf] bg-white">
                <div className="text-center">
                  <Upload className="mx-auto text-[#667085]" size={28} />
                  <p className="mt-3 text-sm font-medium">No indexed documents</p>
                </div>
              </div>
            ) : (
              filteredDocuments.map((document) => (
                <article
                  key={`${document.file_name}-${document.location ?? 'root'}`}
                  className="rounded-md border border-[#d9dee8] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">
                        {document.source_title}
                      </h2>
                      <p className="mt-1 text-xs text-[#667085]">
                        {document.file_name} · {document.file_type}
                        {document.location ? ` · ${document.location}` : ''}
                      </p>
                    </div>
                    <span className="rounded-md bg-[#e9f5f0] px-2 py-1 text-xs font-medium text-[#17614c]">
                      Indexed
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#475467]">
                    {document.content}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="border-l border-[#d9dee8] bg-white px-4 py-5 max-xl:col-span-2 max-xl:border-l-0 max-xl:border-t max-lg:col-span-1">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Graph Add</h2>
              <GitBranch size={17} className="text-[#667085]" />
            </div>
            {latestJob ? (
              <div className="mt-4 rounded-md border border-[#d9dee8] p-3">
                <p className="truncate text-sm font-medium">{latestJob.file_name}</p>
                <p className="mt-1 text-xs text-[#667085]">{latestJob.current_stage}</p>
                <button
                  type="button"
                  onClick={() => void handleStartGraphAdd(latestJob.job_id)}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#263247] px-3 text-sm font-semibold text-white hover:bg-[#1b2434]"
                >
                  <Play size={15} />
                  Start Graph Add
                </button>
              </div>
            ) : null}
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent Jobs</h2>
              <Clock3 size={17} className="text-[#667085]" />
            </div>
            <div className="mt-3 space-y-2">
              {jobs.map((job) => (
                <div key={job.job_id} className="rounded-md border border-[#d9dee8] px-3 py-2">
                  <p className="truncate text-sm font-medium">{job.file_name}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#667085]">
                    <span>{job.current_stage}</span>
                    <span>{job.completed ? 'Done' : 'Open'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Review Queue</h2>
              <Clock3 size={17} className="text-[#667085]" />
            </div>
            <div className="mt-3 rounded-md border border-[#d9dee8] p-3">
              <p className="text-2xl font-semibold">{pendingReviewCount}</p>
              <p className="text-xs text-[#667085]">pending edge candidates</p>
            </div>
          </section>
        </aside>
      </div>

      {modalOpen ? (
        <AddDocumentModal
          onClose={() => setModalOpen(false)}
          onSubmit={(fileName, content) => void handleCreateJob(fileName, content)}
        />
      ) : null}
    </main>
  )
}

export default App
