import db from '../index'
import type { Entry, EntryRow } from '@/types'
import { getStreamsForEntry } from './streams'
import { getDocumentsForEntry } from './documents'
import { recordHistory } from './history'

function hydrate(entry: Entry): EntryRow {
  const user = db
    .prepare('SELECT id, name, email, role, designation, active FROM users WHERE id = ?')
    .get(entry.userId) as EntryRow['user']
  return {
    ...entry,
    user,
    streams: getStreamsForEntry(entry.id),
    documents: getDocumentsForEntry(entry.id),
  }
}

export function listEntriesForDate(date: string): EntryRow[] {
  const entries = db
    .prepare('SELECT * FROM entries WHERE date = ? ORDER BY userId')
    .all(date) as Entry[]
  return entries.map(hydrate)
}

export function getEntry(id: number): EntryRow | undefined {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as Entry | undefined
  return entry ? hydrate(entry) : undefined
}

export function getEntryByDateUser(date: string, userId: number): EntryRow | undefined {
  const entry = db
    .prepare('SELECT * FROM entries WHERE date = ? AND userId = ?')
    .get(date, userId) as Entry | undefined
  return entry ? hydrate(entry) : undefined
}

export function createEntry(date: string, userId: number): EntryRow {
  db.prepare(
    `INSERT OR IGNORE INTO entries (date, userId, today, yesterday, rmComments, blockedOn, version)
     VALUES (?, ?, '', '', '', '', 1)`
  ).run(date, userId)
  return getEntryByDateUser(date, userId)!
}

export interface UpdateFieldResult {
  ok: true
  entry: EntryRow
  newVersion: number
}

export interface ConflictResult {
  ok: false
  conflict: true
  currentEntry: EntryRow
}

export function updateEntryField(
  entryId: number,
  field: 'today' | 'yesterday' | 'rmComments' | 'blockedOn',
  newValue: string,
  expectedVersion: number,
  editedByUserId: number
): UpdateFieldResult | ConflictResult {
  const current = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId) as Entry | undefined
  if (!current) throw new Error('Entry not found')

  const result = db
    .prepare(
      `UPDATE entries
       SET ${field} = ?, version = version + 1, updatedAt = datetime('now')
       WHERE id = ? AND version = ?`
    )
    .run(newValue, entryId, expectedVersion)

  if (result.changes === 0) {
    // Conflict — version mismatch
    return { ok: false, conflict: true, currentEntry: hydrate(current) }
  }

  recordHistory(entryId, field, current[field], newValue, editedByUserId)

  const updated = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId) as Entry
  return { ok: true, entry: hydrate(updated), newVersion: updated.version }
}

export function updateEntryStreams(
  entryId: number,
  streamIds: number[],
  expectedVersion: number,
  editedByUserId: number
): UpdateFieldResult | ConflictResult {
  const current = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId) as Entry | undefined
  if (!current) throw new Error('Entry not found')

  // Version check (touch version on stream change too)
  const result = db
    .prepare(
      `UPDATE entries SET version = version + 1, updatedAt = datetime('now')
       WHERE id = ? AND version = ?`
    )
    .run(entryId, expectedVersion)

  if (result.changes === 0) {
    return { ok: false, conflict: true, currentEntry: hydrate(current) }
  }

  const oldStreams = getStreamsForEntry(entryId)
    .map((s) => s.name)
    .join(', ')

  const del = db.prepare('DELETE FROM entry_streams WHERE entryId = ?')
  const ins = db.prepare('INSERT OR IGNORE INTO entry_streams (entryId, streamId) VALUES (?, ?)')
  db.transaction(() => {
    del.run(entryId)
    for (const sid of streamIds) ins.run(entryId, sid)
  })()

  const newStreams = getStreamsForEntry(entryId)
    .map((s) => s.name)
    .join(', ')
  recordHistory(entryId, 'streams', oldStreams, newStreams, editedByUserId)

  const updated = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId) as Entry
  return { ok: true, entry: hydrate(updated), newVersion: updated.version }
}

/** Idempotent daily rollover. Returns count of new rows created. */
export function runRollover(targetDate: string): number {
  const users = db
    .prepare("SELECT id FROM users WHERE active = 1 AND role != 'ceo'")
    .all() as { id: number }[]

  let created = 0
  for (const { id: userId } of users) {
    // Skip if entry already exists (UNIQUE constraint)
    const existing = db
      .prepare('SELECT id FROM entries WHERE date = ? AND userId = ?')
      .get(targetDate, userId)
    if (existing) continue

    // Find the most recent previous entry for carry-over
    const prev = db
      .prepare("SELECT * FROM entries WHERE userId = ? AND date < ? ORDER BY date DESC LIMIT 1")
      .get(userId, targetDate) as Entry | undefined

    db.prepare(
      `INSERT OR IGNORE INTO entries (date, userId, today, yesterday, rmComments, blockedOn, version)
       VALUES (?, ?, '', ?, '', '', 1)`
    ).run(targetDate, userId, prev?.today ?? '')

    const newEntry = db
      .prepare('SELECT id FROM entries WHERE date = ? AND userId = ?')
      .get(targetDate, userId) as { id: number } | undefined

    // Copy streams from the previous entry
    if (newEntry && prev) {
      const prevStreams = db
        .prepare('SELECT streamId FROM entry_streams WHERE entryId = ?')
        .all(prev.id) as { streamId: number }[]
      const ins = db.prepare('INSERT OR IGNORE INTO entry_streams (entryId, streamId) VALUES (?, ?)')
      for (const { streamId } of prevStreams) {
        ins.run(newEntry.id, streamId)
      }
    }
    created++
  }

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    'last_rollover_date',
    targetDate
  )

  return created
}

export function getLastRolloverDate(): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'last_rollover_date'").get() as
    | { value: string }
    | undefined
  return row?.value ?? ''
}
