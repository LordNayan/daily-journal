'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SaveStatus, type SaveState } from './SaveStatus'
import { ConflictModal } from './ConflictModal'
import type { EntryRow } from '@/types'

interface Props {
  entryId: number
  field: 'today' | 'yesterday' | 'rmComments' | 'blockedOn'
  initialValue: string
  version: number
  readOnly?: boolean
  placeholder?: string
  highlight?: boolean
  onVersionUpdate: (newVersion: number) => void
  onServerUpdate: (updated: EntryRow) => void
}

export function InlineCell({
  entryId,
  field,
  initialValue,
  version,
  readOnly,
  placeholder,
  highlight,
  onVersionUpdate,
  onServerUpdate,
}: Props) {
  const [value, setValue] = useState(initialValue)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [conflict, setConflict] = useState<{ serverEntry: EntryRow } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const versionRef = useRef(version)
  const savedRef = useRef(initialValue)
  const savingRef = useRef<string | null>(null)
  const focusValueRef = useRef(initialValue)
  const saveStateRef = useRef<SaveState>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep versionRef in sync when parent updates version
  useEffect(() => {
    versionRef.current = version
  }, [version])

  // Reset local value when external update arrives (e.g. after conflict resolution)
  useEffect(() => {
    setValue(initialValue)
    savedRef.current = initialValue
  }, [initialValue])

  function updateSaveState(s: SaveState) {
    saveStateRef.current = s
    setSaveState(s)
  }

  const save = useCallback(
    async (val: string, ver: number, commit = false, focusVal?: string) => {
      const unchanged = val === savedRef.current
      // Skip debounce saves when value unchanged; allow blur commits through even if unchanged
      if (unchanged && !commit) return
      if (unchanged && commit && focusVal === val) return // net zero change this session
      if (savingRef.current === val && !commit) return
      savingRef.current = val
      updateSaveState('saving')
      try {
        const res = await fetch(`/api/entries/${entryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field, value: val, version: ver,
            skipHistory: !commit,
            ...(commit && focusVal !== undefined ? { commitOldValue: focusVal } : {}),
          }),
        })

        if (res.status === 409) {
          const data = await res.json()
          updateSaveState('conflict')
          setConflict({ serverEntry: data.currentEntry })
          return
        }

        if (!res.ok) {
          updateSaveState('error')
          return
        }

        const updated: EntryRow = await res.json()
        savedRef.current = val
        versionRef.current = updated.version
        onVersionUpdate(updated.version)
        onServerUpdate(updated)
        updateSaveState('saved')
        setTimeout(() => updateSaveState('idle'), 2000)
      } catch {
        updateSaveState('error')
      } finally {
        savingRef.current = null
      }
    },
    [entryId, field, onVersionUpdate, onServerUpdate]
  )

  function handleChange(val: string) {
    setValue(val)
    // Only re-render save indicator when transitioning away from a visible state
    if (saveStateRef.current === 'saved' || saveStateRef.current === 'error') {
      updateSaveState('idle')
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      save(val, versionRef.current)
    }, 1500)
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const needsCommit = value !== focusValueRef.current
    save(value, versionRef.current, needsCommit, focusValueRef.current)
  }

  // Auto-resize textarea
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  if (readOnly) {
    return (
      <div
        className={`text-sm text-gray-700 whitespace-pre-wrap min-h-[20px] ${highlight ? 'font-medium' : ''}`}
      >
        {value || <span className="text-gray-300">—</span>}
      </div>
    )
  }

  return (
    <div
      className="relative group w-full min-h-[48px] cursor-text pb-5 rounded hover:ring-1 hover:ring-blue-100 hover:bg-blue-50/20 transition-all"
      onClick={() => textareaRef.current?.focus()}
    >
      <textarea
        ref={(el) => {
          (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
          if (el) autoResize(el)
        }}
        value={value}
        onChange={(e) => {
          autoResize(e.target)
          handleChange(e.target.value)
        }}
        onBlur={handleBlur}
        onFocus={(e) => {
          autoResize(e.target)
          focusValueRef.current = savedRef.current
        }}
        placeholder={placeholder}
        rows={1}
        className={`w-full text-sm resize-none overflow-hidden bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white rounded px-1 py-0.5 transition-colors placeholder-gray-300 min-h-[24px]
          ${highlight ? 'font-medium' : ''}
          ${saveState === 'conflict' ? 'ring-2 ring-amber-400' : ''}`}
      />
      <div className="absolute bottom-0 right-0">
        <SaveStatus state={saveState} />
      </div>

      {conflict && (
        <ConflictModal
          field={field}
          myValue={value}
          serverEntry={conflict.serverEntry}
          onClose={() => {
            setConflict(null)
            updateSaveState('idle')
          }}
          onUseServer={() => {
            const serverVal = conflict.serverEntry[field as keyof EntryRow] as string
            setValue(serverVal)
            savedRef.current = serverVal
            versionRef.current = conflict.serverEntry.version
            onVersionUpdate(conflict.serverEntry.version)
            onServerUpdate(conflict.serverEntry)
            setConflict(null)
            updateSaveState('idle')
          }}
          onKeepMine={(serverVersion) => {
            versionRef.current = serverVersion
            setConflict(null)
            updateSaveState('idle')
            save(value, serverVersion)
          }}
        />
      )}
    </div>
  )
}
