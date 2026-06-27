'use client'

import { useState, useRef, useEffect } from 'react'
import type { Stream } from '@/types'

interface Props {
  allStreams: Stream[]
  selected: Stream[]
  onChange: (streams: Stream[]) => void
  readOnly?: boolean
}

export function StreamPicker({ allStreams, selected, onChange, readOnly }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(stream: Stream) {
    const has = selected.some((s) => s.id === stream.id)
    onChange(has ? selected.filter((s) => s.id !== stream.id) : [...selected, stream])
  }

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-1 min-h-[20px]">
        {selected.map((s) => (
          <span key={s.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
            {s.name}
          </span>
        ))}
        {selected.length === 0 && <span className="text-gray-300 text-xs">—</span>}
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex flex-wrap gap-1 min-h-[28px] cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        {selected.map((s) => (
          <span
            key={s.id}
            className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs flex items-center gap-1 group"
          >
            {s.name}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggle(s)
              }}
              className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-800 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        {selected.length === 0 && (
          <span className="text-gray-400 text-xs italic">Click to add streams</span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {allStreams.map((s) => {
            const checked = selected.some((x) => x.id === s.id)
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                onClick={() => toggle(s)}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {}}
                  className="rounded border-gray-300 text-blue-600 pointer-events-none"
                />
                {s.name}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
