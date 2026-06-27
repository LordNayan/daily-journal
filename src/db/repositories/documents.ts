import db from '../index'
import type { Document } from '@/types'

export function getDocumentsForEntry(entryId: number): Document[] {
  return db
    .prepare('SELECT * FROM documents WHERE entryId = ? ORDER BY createdAt')
    .all(entryId) as Document[]
}

export function addDocument(
  entryId: number,
  doc: { label: string; url?: string; fileData?: string; fileName?: string; mimeType?: string }
): Document {
  const result = db
    .prepare(
      `INSERT INTO documents (entryId, label, url, fileData, fileName, mimeType)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(entryId, doc.label, doc.url ?? null, doc.fileData ?? null, doc.fileName ?? null, doc.mimeType ?? null)
  return db
    .prepare('SELECT * FROM documents WHERE id = ?')
    .get(result.lastInsertRowid) as Document
}

export function deleteDocument(id: number, entryId: number): boolean {
  const r = db.prepare('DELETE FROM documents WHERE id = ? AND entryId = ?').run(id, entryId)
  return r.changes > 0
}
