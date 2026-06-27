import { sql, ensureReady } from '../index'
import type { Document } from '@/types'

export async function getDocumentsForEntry(entryId: number): Promise<Document[]> {
  await ensureReady()
  return (await sql`SELECT * FROM documents WHERE "entryId" = ${entryId} ORDER BY "createdAt"`) as Document[]
}

export async function addDocument(
  entryId: number,
  doc: { label: string; url?: string; fileData?: string; fileName?: string; mimeType?: string }
): Promise<Document> {
  await ensureReady()
  const rows = await sql`
    INSERT INTO documents ("entryId", label, url, "fileData", "fileName", "mimeType")
    VALUES (${entryId}, ${doc.label}, ${doc.url ?? null}, ${doc.fileData ?? null}, ${doc.fileName ?? null}, ${doc.mimeType ?? null})
    RETURNING *
  `
  return rows[0] as Document
}

export async function deleteDocument(id: number, entryId: number): Promise<boolean> {
  await ensureReady()
  const rows = await sql`DELETE FROM documents WHERE id = ${id} AND "entryId" = ${entryId} RETURNING id`
  return rows.length > 0
}
