'use client'

import { useState, useRef } from 'react'
import type { Document } from '@/types'

interface Props {
  entryId: number
  docs: Document[]
  readOnly?: boolean
  onAdd: (doc: Document) => void
  onRemove: (docId: number) => void
}

export function DocumentsCell({ entryId, docs, readOnly, onAdd, onRemove }: Props) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function submitLink() {
    if (!label.trim()) return
    const res = await fetch(`/api/entries/${entryId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), url: url.trim() || undefined }),
    })
    if (res.ok) {
      onAdd(await res.json())
      setLabel('')
      setUrl('')
      setAdding(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('File must be under 2 MB (demo limit)')
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const res = await fetch(`/api/entries/${entryId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: file.name,
          fileData: reader.result as string,
          fileName: file.name,
          mimeType: file.type,
        }),
      })
      if (res.ok) onAdd(await res.json())
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  async function removeDoc(docId: number) {
    await fetch(`/api/entries/${entryId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId }),
    })
    onRemove(docId)
  }

  return (
    <div className="space-y-1">
      {docs.map((d) => (
        <div key={d.id} className="flex items-center gap-1 text-xs">
          {d.url ? (
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[130px]"
              title={d.label}
            >
              <svg className="w-3 h-3 shrink-0 opacity-60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3M13 1h2m0 0v2m0-2L9 7" />
              </svg>
              {d.label}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-gray-600 truncate max-w-[130px]" title={d.fileName ?? d.label}>
              <svg className="w-3 h-3 shrink-0 opacity-40" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6L9 1z" />
                <path d="M9 1v5h5" />
              </svg>
              {d.label}
            </span>
          )}
          {!readOnly && (
            <button
              onClick={() => removeDoc(d.id)}
              className="text-gray-300 hover:text-red-500 leading-none shrink-0"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {!readOnly && (
        <div>
          {!adding ? (
            <div className="flex gap-1">
              <button
                onClick={() => setAdding(true)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                + link
              </button>
              <span className="text-gray-300 text-xs">·</span>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
              >
                {uploading ? 'uploading…' : '+ file'}
              </button>
              <input type="file" ref={fileRef} onChange={handleFile} className="hidden" />
            </div>
          ) : (
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                type="url"
                placeholder="URL (optional)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="flex gap-1">
                <button
                  onClick={submitLink}
                  className="text-xs bg-blue-600 text-white rounded px-2 py-0.5 hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
