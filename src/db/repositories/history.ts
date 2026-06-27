import { sql, ensureReady } from '../index'
import type { HistoryRecord } from '@/types'

export async function recordHistory(
  entryId: number,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  editedByUserId: number
): Promise<void> {
  await ensureReady()
  await sql`
    INSERT INTO edit_history ("entryId", field, "oldValue", "newValue", "editedByUserId")
    VALUES (${entryId}, ${field}, ${oldValue}, ${newValue}, ${editedByUserId})
  `
}

export async function getHistoryForEntry(entryId: number): Promise<HistoryRecord[]> {
  await ensureReady()
  return (await sql`
    SELECT h.id, h."entryId", h.field, h."oldValue", h."newValue",
           h."editedByUserId", u.name AS "editedByName", h."editedAt"
    FROM edit_history h
    JOIN users u ON u.id = h."editedByUserId"
    WHERE h."entryId" = ${entryId}
    ORDER BY h."editedAt" DESC
  `) as HistoryRecord[]
}
