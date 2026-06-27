import { sql, ensureReady } from '../index'

export async function getSetting(key: string): Promise<string | undefined> {
  await ensureReady()
  const rows = await sql`SELECT value FROM settings WHERE key = ${key}`
  return rows[0]?.value as string | undefined
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureReady()
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `
}

export async function getAllSettings(): Promise<Record<string, string>> {
  await ensureReady()
  const rows = await sql`SELECT key, value FROM settings` as { key: string; value: string }[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}
