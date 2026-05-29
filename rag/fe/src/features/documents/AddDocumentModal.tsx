import { useState } from 'react'
import { Upload, X } from 'lucide-react'

export function AddDocumentModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (fileName: string, content: string) => void
}) {
  const [fileName, setFileName] = useState('')
  const [content, setContent] = useState('')
  const [dragging, setDragging] = useState(false)

  async function readFile(file: File) {
    const text = await file.text()
    setFileName(file.name)
    setContent(text)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/45 px-4">
      <div className="w-full max-w-2xl rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#d9dee8] px-5 py-4">
          <h2 className="text-base font-semibold">Add Document</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#f2f4f7]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <label
            className={[
              'flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 text-center',
              dragging ? 'border-[#1f7a5f] bg-[#e9f5f0]' : 'border-[#b8c0cf] bg-[#f8fafc]',
            ].join(' ')}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              const file = event.dataTransfer.files.item(0)
              if (file) {
                void readFile(file)
              }
            }}
          >
            <Upload size={28} className="text-[#667085]" />
            <span className="mt-3 text-sm font-medium">Drop text document</span>
            <input
              name="document-file"
              type="file"
              accept=".txt,.md,.json,.csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.item(0)
                if (file) {
                  void readFile(file)
                }
              }}
            />
          </label>

          <div className="mt-4 grid gap-3">
            <input
              name="document-file-name"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              className="h-10 rounded-md border border-[#cfd6e4] px-3 text-sm outline-none focus:border-[#1f7a5f]"
              placeholder="document.json"
            />
            <textarea
              name="document-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-44 resize-y rounded-md border border-[#cfd6e4] p-3 font-mono text-sm leading-6 outline-none focus:border-[#1f7a5f]"
              placeholder="Paste text, JSON, Markdown, or CSV"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#d9dee8] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-[#cfd6e4] px-3 text-sm font-medium hover:bg-[#f2f4f7]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!fileName.trim() || !content.trim()}
            onClick={() => onSubmit(fileName.trim(), content)}
            className="h-10 rounded-md bg-[#1f7a5f] px-3 text-sm font-semibold text-white hover:bg-[#17614c] disabled:cursor-not-allowed disabled:bg-[#98a2b3]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
