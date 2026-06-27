'use client'

import { useEffect, useState } from 'react'
import type { HistoryRecord } from '@/types'

interface Props {
  entryId: number
  personName: string
  onClose: () => void
}

export function HistoryModal({ entryId, personName, onClose }: Props) {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/entries/${entryId}/history`)
      .then((r) => r.json())
      .then((data) => setRecords(data))
      .finally(() => setLoading(false))
  }, [entryId])

  const fieldLabel: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    rmComments: 'RM Comments',
    blockedOn: 'Blocked On',
    streams: 'Streams',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">
            Edit history — {personName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3">
          {loading && <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>}
          {!loading && records.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No edits recorded yet.</p>
          )}
          {records.map((r) => (
            <div key={r.id} className="border-b last:border-0 py-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-800">
                  {fieldLabel[r.field] ?? r.field}
                </span>
                <span className="text-xs text-gray-400">
                  {r.editedByName} · {new Date(r.editedAt).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-red-50 rounded p-2">
                  <p className="text-red-400 font-medium mb-1 uppercase tracking-wide text-[10px]">Before</p>
                  <p className="text-gray-700 whitespace-pre-wrap break-words">
                    {r.oldValue || <em className="text-gray-400">empty</em>}
                  </p>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <p className="text-green-500 font-medium mb-1 uppercase tracking-wide text-[10px]">After</p>
                  <p className="text-gray-700 whitespace-pre-wrap break-words">
                    {r.newValue || <em className="text-gray-400">empty</em>}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
