import db from '../index'
import type { Stream } from '@/types'

export function listStreams(): Stream[] {
  return db
    .prepare('SELECT id, name, active FROM streams WHERE active = 1 ORDER BY name')
    .all() as Stream[]
}

export function listAllStreams(): Stream[] {
  return db
    .prepare('SELECT id, name, active FROM streams ORDER BY active DESC, name')
    .all() as Stream[]
}

export function getStreamsForEntry(entryId: number): Stream[] {
  return db
    .prepare(
      `SELECT s.id, s.name, s.active
       FROM streams s
       JOIN entry_streams es ON es.streamId = s.id
       WHERE es.entryId = ?
       ORDER BY s.name`
    )
    .all(entryId) as Stream[]
}

export function setStreamsForEntry(entryId: number, streamIds: number[]): void {
  const del = db.prepare('DELETE FROM entry_streams WHERE entryId = ?')
  const ins = db.prepare('INSERT OR IGNORE INTO entry_streams (entryId, streamId) VALUES (?, ?)')
  db.transaction(() => {
    del.run(entryId)
    for (const sid of streamIds) ins.run(entryId, sid)
  })()
}

export function createStream(name: string): Stream {
  const r = db.prepare('INSERT INTO streams (name, active) VALUES (?, 1)').run(name)
  return db.prepare('SELECT id, name, active FROM streams WHERE id = ?').get(r.lastInsertRowid) as Stream
}

export function updateStream(id: number, name: string): Stream | undefined {
  db.prepare('UPDATE streams SET name = ? WHERE id = ?').run(name, id)
  return db.prepare('SELECT id, name, active FROM streams WHERE id = ?').get(id) as Stream | undefined
}

export function setStreamActive(id: number, active: boolean): void {
  db.prepare('UPDATE streams SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
}
