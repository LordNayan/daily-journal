import db from '../index'
import type { HistoryRecord } from '@/types'

export function recordHistory(
  entryId: number,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  editedByUserId: number
): void {
  db.prepare(
    `INSERT INTO edit_history (entryId, field, oldValue, newValue, editedByUserId)
     VALUES (?, ?, ?, ?, ?)`
  ).run(entryId, field, oldValue, newValue, editedByUserId)
}

export function getHistoryForEntry(entryId: number): HistoryRecord[] {
  return db
    .prepare(
      `SELECT h.id, h.entryId, h.field, h.oldValue, h.newValue,
              h.editedByUserId, u.name AS editedByName, h.editedAt
       FROM edit_history h
       JOIN users u ON u.id = h.editedByUserId
       WHERE h.entryId = ?
       ORDER BY h.editedAt DESC`
    )
    .all(entryId) as HistoryRecord[]
}
