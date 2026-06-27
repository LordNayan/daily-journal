'use client'

import type { EntryRow } from '@/types'

interface Props {
  field: string
  myValue: string
  serverEntry: EntryRow
  onKeepMine: (serverVersion: number) => void
  onUseServer: () => void
  onClose: () => void
}

const fieldLabel: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  rmComments: 'RM Comments',
  blockedOn: 'Blocked On',
  streams: 'Streams',
}

export function ConflictModal({ field, myValue, serverEntry, onKeepMine, onUseServer, onClose }: Props) {
  const serverValue = field === 'streams'
    ? serverEntry.streams.map((s) => s.name).join(', ')
    : serverEntry[field as keyof EntryRow] as string

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-amber-700">Edit Conflict Detected</h2>
          <p className="text-sm text-gray-500 mt-1">
            Someone else updated <strong>{fieldLabel[field] ?? field}</strong> since you started
            editing. Choose how to resolve.
          </p>
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-3 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-blue-600 font-medium text-xs uppercase tracking-wide mb-2">Your version</p>
            <p className="text-gray-800 whitespace-pre-wrap break-words">
              {myValue || <em className="text-gray-400">empty</em>}
            </p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-amber-600 font-medium text-xs uppercase tracking-wide mb-2">Server version</p>
            <p className="text-gray-800 whitespace-pre-wrap break-words">
              {serverValue || <em className="text-gray-400">empty</em>}
            </p>
          </div>
        </div>

        <div className="px-5 pb-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={onUseServer}
            className="text-sm border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-md px-3 py-1.5"
          >
            Use server version
          </button>
          <button
            onClick={() => onKeepMine(serverEntry.version)}
            className="text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md px-3 py-1.5"
          >
            Keep my version
          </button>
        </div>
      </div>
    </div>
  )
}
