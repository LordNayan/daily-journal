import { sql, ensureReady } from '../index'
import type { Stream } from '@/types'

export async function listStreams(): Promise<Stream[]> {
  await ensureReady()
  return (await sql`SELECT id, name, active FROM streams WHERE active = 1 ORDER BY name`) as Stream[]
}

export async function listAllStreams(): Promise<Stream[]> {
  await ensureReady()
  return (await sql`SELECT id, name, active FROM streams ORDER BY active DESC, name`) as Stream[]
}

export async function getStreamsForEntry(entryId: number): Promise<Stream[]> {
  await ensureReady()
  return (await sql`
    SELECT s.id, s.name, s.active
    FROM streams s
    JOIN entry_streams es ON es."streamId" = s.id
    WHERE es."entryId" = ${entryId}
    ORDER BY s.name
  `) as Stream[]
}

export async function setStreamsForEntry(entryId: number, streamIds: number[]): Promise<void> {
  await ensureReady()
  await sql`DELETE FROM entry_streams WHERE "entryId" = ${entryId}`
  for (const sid of streamIds) {
    await sql`INSERT INTO entry_streams ("entryId", "streamId") VALUES (${entryId}, ${sid}) ON CONFLICT DO NOTHING`
  }
}

export async function createStream(name: string): Promise<Stream> {
  await ensureReady()
  const rows = await sql`INSERT INTO streams (name, active) VALUES (${name}, 1) RETURNING id, name, active`
  return rows[0] as Stream
}

export async function updateStream(id: number, name: string): Promise<Stream | undefined> {
  await ensureReady()
  const rows = await sql`UPDATE streams SET name = ${name} WHERE id = ${id} RETURNING id, name, active`
  return rows[0] as Stream | undefined
}

export async function setStreamActive(id: number, active: boolean): Promise<void> {
  await ensureReady()
  await sql`UPDATE streams SET active = ${active ? 1 : 0} WHERE id = ${id}`
}
