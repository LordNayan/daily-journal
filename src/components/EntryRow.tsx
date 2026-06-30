'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { EntryRow as EntryRowType, Stream, Session } from '@/types'
import { InlineCell } from './InlineCell'
import { StreamPicker } from './StreamPicker'
import { DocumentsCell } from './DocumentsCell'
import { HistoryModal } from './HistoryModal'
import { SaveStatus, type SaveState } from './SaveStatus'
import { ConflictModal } from './ConflictModal'

const DESIGNATION_COLORS: Record<string, string> = {
  BE: 'bg-violet-100 text-violet-700',
  FE: 'bg-indigo-100 text-indigo-700',
  PM: 'bg-emerald-100 text-emerald-700',
  QA: 'bg-orange-100 text-orange-700',
  AI: 'bg-sky-100 text-sky-700',
  Design: 'bg-pink-100 text-pink-700',
  DevOps: 'bg-amber-100 text-amber-700',
  CTO: 'bg-red-100 text-red-700',
}

function designationBadge(d: string): string {
  return DESIGNATION_COLORS[d] ?? 'bg-gray-100 text-gray-600'
}

interface Props {
  entry: EntryRowType
  allStreams: Stream[]
  session: Session
  isToday: boolean
  isMine: boolean
}

export function EntryRow({ entry: initialEntry, allStreams, session, isToday, isMine }: Props) {
  const [entry, setEntry] = useState<EntryRowType>(initialEntry)
  const [version, setVersion] = useState(initialEntry.version)
  const [showHistory, setShowHistory] = useState(false)
  const [bgColors, setBgColors] = useState<Record<string, string | null>>(() => {
    try { return JSON.parse(initialEntry.bgColors || '{}') } catch { return {} }
  })
  const [streamSaveState, setStreamSaveState] = useState<SaveState>('idle')
  const [streamConflict, setStreamConflict] = useState<{ serverEntry: EntryRowType } | null>(null)

  const canEdit = isToday && (isMine || session.role === 'pm')
  const canEditRM = isToday && session.role === 'cto'
  const readOnly = !isToday

  function handleVersionUpdate(v: number) {
    setVersion(v)
  }

  function handleServerUpdate(updated: EntryRowType) {
    setEntry(updated)
    setVersion(updated.version)
  }

  async function handleBgColorChange(field: string, color: string | null) {
    const updated = { ...bgColors, [field]: color }
    setBgColors(updated)
    await fetch(`/api/entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'bgColors', bgColors: updated }),
    })
  }

  async function handleStreamsChange(streams: Stream[]) {
    setStreamSaveState('saving')
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'streams', streamIds: streams.map((s) => s.id), version }),
      })

      if (res.status === 409) {
        const data = await res.json()
        setStreamSaveState('conflict')
        setStreamConflict({ serverEntry: data.currentEntry })
        return
      }

      if (!res.ok) {
        setStreamSaveState('error')
        return
      }

      const updated: EntryRowType = await res.json()
      setEntry(updated)
      setVersion(updated.version)
      setStreamSaveState('saved')
      setTimeout(() => setStreamSaveState('idle'), 2000)
    } catch {
      setStreamSaveState('error')
    }
  }

  return (
    <>
      <tr
        className={`group border-b border-gray-100 hover:bg-gray-50/50 transition-colors
          max-md:block max-md:rounded-xl max-md:border max-md:border-gray-200 max-md:bg-white max-md:p-3 max-md:space-y-3 max-md:hover:bg-white
          ${isMine
            ? 'bg-blue-50/40 border-l-[3px] border-l-blue-400 max-md:border-l-[3px] max-md:border-l-blue-400'
            : 'border-l-[3px] border-l-transparent'
          }`}
      >
        {/* Person */}
        <td className="px-3 py-2 align-top w-36 shrink-0 max-md:block max-md:px-0 max-md:py-0 max-md:pb-2 max-md:border-b max-md:border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm font-medium ${isMine ? 'text-blue-700' : 'text-gray-800'}`}>
                {entry.user.name}
                {isMine && <span className="ml-1 text-xs text-blue-400 font-normal">(you)</span>}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${designationBadge(entry.user.designation)}`}>
                {entry.user.designation || entry.user.role}
              </span>
            </div>
            <button
              onClick={() => setShowHistory(true)}
              className="text-[10px] text-gray-400 hover:text-gray-600 underline md:hidden"
            >
              history
            </button>
          </div>
          <button
            onClick={() => setShowHistory(true)}
            className="mt-1 text-[10px] text-gray-400 hover:text-gray-600 underline hidden md:block opacity-0 group-hover:opacity-100 transition-opacity"
          >
            history
          </button>
        </td>

        {/* Streams */}
        <td className="px-3 py-2 align-top w-44 max-md:block max-md:px-0 max-md:py-0">
          <p className="md:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Streams</p>
          <div className="flex flex-col gap-0.5">
            <StreamPicker
              allStreams={allStreams}
              selected={entry.streams}
              onChange={handleStreamsChange}
              readOnly={!canEdit && !canEditRM}
            />
            <SaveStatus state={streamSaveState} />
          </div>
        </td>

        {/* RM Comments */}
        <td className={`px-3 py-2 align-top w-48 bg-amber-50/30 max-md:block max-md:px-0 max-md:py-0
          ${!canEditRM && !entry.rmComments ? 'max-md:hidden' : ''}`}>
          <p className="md:hidden text-[10px] font-semibold uppercase tracking-wide text-amber-500 mb-1">RM Comments</p>
          <div className="space-y-1">
            {!canEditRM && entry.rmComments && isMine && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800 mb-1">
                <p className="font-medium text-amber-600 text-[10px] uppercase tracking-wide mb-1">
                  Comment from RM
                </p>
                <div className="rich-text" dangerouslySetInnerHTML={{ __html: entry.rmComments }} />
                <button
                  className="mt-1.5 text-[10px] text-blue-500 hover:text-blue-700 underline"
                  onClick={() => {
                    navigator.clipboard.writeText(entry.rmComments)
                  }}
                >
                  Copy to clipboard
                </button>
              </div>
            )}
            {canEditRM ? (
              <InlineCell
                key={`${entry.id}-rmComments`}
                entryId={entry.id}
                field="rmComments"
                initialValue={entry.rmComments}
                version={version}
                readOnly={false}
                placeholder="Leave a comment…"
                bgColor={bgColors['rmComments']}
                onBgColorChange={(c) => handleBgColorChange('rmComments', c)}
                onVersionUpdate={handleVersionUpdate}
                onServerUpdate={handleServerUpdate}
              />
            ) : (
              !isMine && (
                entry.rmComments
                  ? <div className="text-sm text-gray-500 rich-text" dangerouslySetInnerHTML={{ __html: entry.rmComments }} />
                  : <span className="text-gray-300">—</span>
              )
            )}
          </div>
        </td>

        {/* Today */}
        <td className="px-3 py-2 align-top min-w-[200px] max-md:block max-md:px-0 max-md:py-0">
          <p className="md:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Today</p>
          <InlineCell
            key={`${entry.id}-today`}
            entryId={entry.id}
            field="today"
            initialValue={entry.today}
            version={version}
            readOnly={readOnly || !canEdit}
            placeholder="What are you working on today?"
            highlight={isMine}
            bgColor={bgColors['today']}
            onBgColorChange={canEdit ? (c) => handleBgColorChange('today', c) : undefined}
            onVersionUpdate={handleVersionUpdate}
            onServerUpdate={handleServerUpdate}
          />
        </td>

        {/* Yesterday */}
        <td className="px-3 py-2 align-top min-w-[180px] max-md:block max-md:px-0 max-md:py-0">
          <p className="md:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Yesterday</p>
          <InlineCell
            key={`${entry.id}-yesterday`}
            entryId={entry.id}
            field="yesterday"
            initialValue={entry.yesterday}
            version={version}
            readOnly={readOnly || !canEdit}
            placeholder="What did you complete yesterday?"
            bgColor={bgColors['yesterday']}
            onBgColorChange={canEdit ? (c) => handleBgColorChange('yesterday', c) : undefined}
            onVersionUpdate={handleVersionUpdate}
            onServerUpdate={handleServerUpdate}
          />
        </td>

        {/* Blocked On */}
        <td className={`px-3 py-2 align-top w-40 transition-colors max-md:block max-md:px-0 max-md:py-0
          ${entry.blockedOn ? 'bg-red-50/60' : ''}
          ${!canEdit && !entry.blockedOn ? 'max-md:hidden' : ''}`}>
          <p className="md:hidden text-[10px] font-semibold uppercase tracking-wide text-red-400 mb-1">Blocked On</p>
          <InlineCell
            key={`${entry.id}-blockedOn`}
            entryId={entry.id}
            field="blockedOn"
            initialValue={entry.blockedOn}
            version={version}
            readOnly={readOnly || !canEdit}
            placeholder="Any blockers?"
            bgColor={bgColors['blockedOn']}
            onBgColorChange={canEdit ? (c) => handleBgColorChange('blockedOn', c) : undefined}
            onVersionUpdate={handleVersionUpdate}
            onServerUpdate={handleServerUpdate}
          />
        </td>

        {/* Documents */}
        <td className={`px-3 py-2 align-top w-44 max-md:block max-md:px-0 max-md:py-0
          ${!canEdit && entry.documents.length === 0 ? 'max-md:hidden' : ''}`}>
          <p className="md:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Documents</p>
          <DocumentsCell
            entryId={entry.id}
            docs={entry.documents}
            readOnly={readOnly || !canEdit}
            onAdd={(doc) => setEntry((e) => ({ ...e, documents: [...e.documents, doc] }))}
            onRemove={(id) => setEntry((e) => ({ ...e, documents: e.documents.filter((d) => d.id !== id) }))}
          />
        </td>
      </tr>

      {showHistory && createPortal(
        <HistoryModal
          entryId={entry.id}
          personName={entry.user.name}
          onClose={() => setShowHistory(false)}
        />,
        document.body
      )}

      {streamConflict && createPortal(
        <ConflictModal
          field="streams"
          myValue={entry.streams.map((s) => s.name).join(', ')}
          serverEntry={streamConflict.serverEntry}
          onClose={() => {
            setStreamConflict(null)
            setStreamSaveState('idle')
          }}
          onUseServer={() => {
            setEntry(streamConflict.serverEntry)
            setVersion(streamConflict.serverEntry.version)
            setStreamConflict(null)
            setStreamSaveState('idle')
          }}
          onKeepMine={(serverVersion) => {
            setStreamConflict(null)
            setStreamSaveState('idle')
            setVersion(serverVersion)
            handleStreamsChange(entry.streams)
          }}
        />,
        document.body
      )}
    </>
  )
}
