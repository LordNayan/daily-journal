import { sql, ensureReady } from '../index'
import type { Entry, EntryRow } from '@/types'
import { getStreamsForEntry } from './streams'
import { getDocumentsForEntry } from './documents'
import { recordHistory } from './history'

async function hydrate(entry: Entry): Promise<EntryRow> {
  const users = await sql`SELECT id, name, email, role, designation, active FROM users WHERE id = ${entry.userId}`
  const [streams, documents] = await Promise.all([
    getStreamsForEntry(entry.id),
    getDocumentsForEntry(entry.id),
  ])
  return { ...entry, user: users[0] as EntryRow['user'], streams, documents }
}

export async function listEntriesForDate(date: string): Promise<EntryRow[]> {
  await ensureReady()
  const entries = await sql`SELECT * FROM entries WHERE date = ${date} ORDER BY "userId"` as Entry[]
  return Promise.all(entries.map(hydrate))
}

export async function getEntry(id: number): Promise<EntryRow | undefined> {
  await ensureReady()
  const rows = await sql`SELECT * FROM entries WHERE id = ${id}`
  const entry = rows[0] as Entry | undefined
  return entry ? hydrate(entry) : undefined
}

export async function getEntryByDateUser(date: string, userId: number): Promise<EntryRow | undefined> {
  await ensureReady()
  const rows = await sql`SELECT * FROM entries WHERE date = ${date} AND "userId" = ${userId}`
  const entry = rows[0] as Entry | undefined
  return entry ? hydrate(entry) : undefined
}

export async function createEntry(date: string, userId: number): Promise<EntryRow> {
  await ensureReady()
  await sql`
    INSERT INTO entries (date, "userId", today, yesterday, "rmComments", "blockedOn", version)
    VALUES (${date}, ${userId}, '', '', '', '', 1)
    ON CONFLICT DO NOTHING
  `
  return (await getEntryByDateUser(date, userId))!
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

export async function updateEntryField(
  entryId: number,
  field: 'today' | 'yesterday' | 'rmComments' | 'blockedOn',
  newValue: string,
  expectedVersion: number,
  editedByUserId: number,
  opts: { skipHistory?: boolean; commitOldValue?: string } = {}
): Promise<UpdateFieldResult | ConflictResult> {
  await ensureReady()
  const { skipHistory = false, commitOldValue } = opts

  const currentRows = await sql`SELECT * FROM entries WHERE id = ${entryId}`
  const current = currentRows[0] as Entry | undefined
  if (!current) throw new Error('Entry not found')

  // Debounce already saved this value — skip the UPDATE but commit history if needed
  if (current[field] === newValue) {
    if (!skipHistory && commitOldValue !== undefined && commitOldValue !== newValue) {
      await recordHistory(entryId, field, commitOldValue, newValue, editedByUserId)
    }
    return { ok: true, entry: await hydrate(current), newVersion: current.version }
  }

  // Field is validated by the caller (allowedFields check in the route handler)
  let updated: Record<string, unknown>[]
  if (field === 'today') {
    updated = await sql`UPDATE entries SET today = ${newValue}, version = version + 1, "updatedAt" = NOW() WHERE id = ${entryId} AND version = ${expectedVersion} RETURNING *`
  } else if (field === 'yesterday') {
    updated = await sql`UPDATE entries SET yesterday = ${newValue}, version = version + 1, "updatedAt" = NOW() WHERE id = ${entryId} AND version = ${expectedVersion} RETURNING *`
  } else if (field === 'rmComments') {
    updated = await sql`UPDATE entries SET "rmComments" = ${newValue}, version = version + 1, "updatedAt" = NOW() WHERE id = ${entryId} AND version = ${expectedVersion} RETURNING *`
  } else {
    updated = await sql`UPDATE entries SET "blockedOn" = ${newValue}, version = version + 1, "updatedAt" = NOW() WHERE id = ${entryId} AND version = ${expectedVersion} RETURNING *`
  }

  if (updated.length === 0) {
    return { ok: false, conflict: true, currentEntry: await hydrate(current) }
  }

  if (!skipHistory) {
    const oldVal = commitOldValue ?? current[field] ?? null
    await recordHistory(entryId, field, oldVal, newValue, editedByUserId)
  }

  const entry = updated[0] as unknown as Entry
  return { ok: true, entry: await hydrate(entry), newVersion: entry.version }
}

export async function updateEntryStreams(
  entryId: number,
  streamIds: number[],
  expectedVersion: number,
  editedByUserId: number
): Promise<UpdateFieldResult | ConflictResult> {
  await ensureReady()
  const currentRows = await sql`SELECT * FROM entries WHERE id = ${entryId}`
  const current = currentRows[0] as Entry | undefined
  if (!current) throw new Error('Entry not found')

  const updated = await sql`
    UPDATE entries SET version = version + 1, "updatedAt" = NOW()
    WHERE id = ${entryId} AND version = ${expectedVersion}
    RETURNING *
  `

  if (updated.length === 0) {
    return { ok: false, conflict: true, currentEntry: await hydrate(current) }
  }

  const oldStreams = (await getStreamsForEntry(entryId)).map((s) => s.name).join(', ')

  await sql`DELETE FROM entry_streams WHERE "entryId" = ${entryId}`
  for (const sid of streamIds) {
    await sql`INSERT INTO entry_streams ("entryId", "streamId") VALUES (${entryId}, ${sid}) ON CONFLICT DO NOTHING`
  }

  const newStreams = (await getStreamsForEntry(entryId)).map((s) => s.name).join(', ')
  await recordHistory(entryId, 'streams', oldStreams, newStreams, editedByUserId)

  const entry = updated[0] as Entry
  return { ok: true, entry: await hydrate(entry), newVersion: entry.version }
}

export async function runRollover(targetDate: string): Promise<number> {
  await ensureReady()
  const users = await sql`SELECT id FROM users WHERE active = 1 AND role != 'ceo'`

  let created = 0
  for (const { id: userId } of users) {
    const existing = await sql`SELECT id FROM entries WHERE date = ${targetDate} AND "userId" = ${userId}`
    if (existing.length > 0) continue

    const prevRows = await sql`
      SELECT * FROM entries WHERE "userId" = ${userId} AND date < ${targetDate} AND today != ''
      ORDER BY date DESC LIMIT 1
    `
    const prev = prevRows[0] as Entry | undefined

    const inserted = await sql`
      INSERT INTO entries (date, "userId", today, yesterday, "rmComments", "blockedOn", version)
      VALUES (${targetDate}, ${userId}, '', ${prev?.today ?? ''}, '', '', 1)
      ON CONFLICT DO NOTHING
      RETURNING id
    `

    if (inserted.length > 0) {
      created++
      if (prev) {
        const newEntryId = inserted[0].id
        const prevStreams = await sql`SELECT "streamId" FROM entry_streams WHERE "entryId" = ${prev.id}`
        for (const { streamId } of prevStreams) {
          await sql`INSERT INTO entry_streams ("entryId", "streamId") VALUES (${newEntryId}, ${streamId}) ON CONFLICT DO NOTHING`
        }
      }
    }
  }

  const prevDate = new Date(targetDate)
  prevDate.setUTCDate(prevDate.getUTCDate() - 1)
  const prevDateStr = prevDate.toISOString().split('T')[0]
  await sql`UPDATE entries SET "rmComments" = '', version = version + 1, "updatedAt" = NOW() WHERE date = ${prevDateStr} AND "rmComments" != ''`

  await sql`
    INSERT INTO settings (key, value) VALUES ('last_rollover_date', ${targetDate})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `

  return created
}

export async function getLastRolloverDate(): Promise<string> {
  await ensureReady()
  const rows = await sql`SELECT value FROM settings WHERE key = 'last_rollover_date'`
  return (rows[0]?.value as string) ?? ''
}
