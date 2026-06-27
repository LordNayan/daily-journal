'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EntryRow, Session, Stream } from '@/types'
import { EntryRow as EntryRowComponent } from './EntryRow'
import { ChangePasswordModal } from './ChangePasswordModal'
import { RolloverCountdown } from './RolloverCountdown'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function JournalView() {
  const [session, setSession] = useState<Session | null>(null)
  const [date, setDate] = useState(todayStr())
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [allStreams, setAllStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [rollingOver, setRollingOver] = useState(false)
  const [rolloverMsg, setRolloverMsg] = useState('')
  const [rolloverTime, setRolloverTime] = useState<string | null>(null)

  const isToday = date === todayStr()

  // Load session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setSession(d.user))
      .catch(() => {
        window.location.href = '/login'
      })
  }, [])

  // Load streams + rollover time once
  useEffect(() => {
    fetch('/api/streams').then((r) => r.json()).then(setAllStreams)
    fetch('/api/settings').then((r) => r.json()).then((d) => setRolloverTime(d.rolloverTime))
  }, [])

  // Load entries for selected date
  const loadEntries = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/entries?date=${d}`)
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries(date)
  }, [date, loadEntries])

  async function handleRollover() {
    setRollingOver(true)
    setRolloverMsg('')
    try {
      const res = await fetch('/api/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr() }),
      })
      const data = await res.json()
      if (res.ok) {
        setRolloverMsg(`Done — ${data.created} new row(s) created.`)
        loadEntries(date)
      } else {
        setRolloverMsg(data.error ?? 'Failed')
      }
    } catch {
      setRolloverMsg('Network error')
    } finally {
      setRollingOver(false)
      setTimeout(() => setRolloverMsg(''), 4000)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  if (!session) return null

  if (session.mustChangePassword) {
    return (
      <ChangePasswordModal
        name={session.name}
        onDone={() => {
          // Refresh session from server (cookie has been reissued with mustChangePassword=false)
          fetch('/api/auth/me')
            .then((r) => r.json())
            .then((d) => setSession(d.user))
        }}
      />
    )
  }

  // Pin current user first, then sort by designation group, then name
  const DESIG_ORDER: Record<string, number> = {
    CTO: 0, PM: 1, BE: 2, FE: 3, AI: 4, QA: 5, Design: 6, DevOps: 7,
  }
  const sorted = [...entries].sort((a, b) => {
    if (a.userId === session.userId) return -1
    if (b.userId === session.userId) return 1
    const da = DESIG_ORDER[a.user.designation] ?? 99
    const db2 = DESIG_ORDER[b.user.designation] ?? 99
    if (da !== db2) return da - db2
    return a.user.name.localeCompare(b.user.name)
  })

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <h1 className="text-base font-bold text-gray-900 shrink-0">Daily Journal</h1>

        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {!isToday && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            Viewing past date — read only
          </span>
        )}

        {rolloverTime && <RolloverCountdown rolloverTime={rolloverTime} />}

        <div className="ml-auto flex items-center gap-3">
          {(session.role === 'pm' || session.role === 'admin' || session.role === 'cto') && isToday && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRollover}
                disabled={rollingOver}
                className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md px-3 py-1.5 transition-colors"
              >
                {rollingOver ? 'Rolling over…' : 'Start new day'}
              </button>
              {rolloverMsg && (
                <span className="text-xs text-green-600">{rolloverMsg}</span>
              )}
            </div>
          )}

          <div className="text-sm text-gray-500 hidden sm:block">
            {session.name}
            {session.designation && (
              <span className="ml-1 text-xs text-gray-400">· {session.designation}</span>
            )}
          </div>
          {(session.role === 'admin' || session.role === 'cto') && (
            <a href="/admin" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              Admin
            </a>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Table */}
      <main className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <svg className="animate-spin h-6 w-6 text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading entries…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">No entries for {date}</p>
              {isToday && (session.role === 'pm' || session.role === 'admin' || session.role === 'cto') && (
                <button
                  onClick={handleRollover}
                  className="mt-1 text-sm text-indigo-600 hover:text-indigo-800 underline"
                >
                  Run rollover to create today&apos;s rows
                </button>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-white border-b-2 border-gray-200 text-xs text-gray-500 uppercase tracking-wide shadow-sm">
                <th className="px-3 py-2.5 font-semibold w-36">Person</th>
                <th className="px-3 py-2.5 font-semibold w-44">Stream(s)</th>
                <th className="px-3 py-2.5 font-semibold w-48 bg-amber-50/60">RM Comments</th>
                <th className="px-3 py-2.5 font-semibold min-w-[200px]">Today</th>
                <th className="px-3 py-2.5 font-semibold min-w-[180px]">Yesterday</th>
                <th className="px-3 py-2.5 font-semibold w-40">Blocked On</th>
                <th className="px-3 py-2.5 font-semibold w-44">Documents</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <EntryRowComponent
                  key={entry.id}
                  entry={entry}
                  allStreams={allStreams}
                  session={session}
                  isToday={isToday}
                  isMine={entry.userId === session.userId}
                />
              ))}
            </tbody>
          </table>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 px-4 py-2 text-xs text-gray-400 flex items-center justify-between">
        <span>Daily Journal · {date}</span>
        <span className="text-amber-500">
          ⚠ In-memory DB — data resets on server restart
        </span>
      </footer>
    </div>
  )
}
