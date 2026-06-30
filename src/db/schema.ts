import { sql } from './client'

export async function initSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      "passwordHash" TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('engineer','cto','pm','admin','ceo')),
      designation TEXT NOT NULL DEFAULT '',
      "mustChangePassword" SMALLINT NOT NULL DEFAULT 1,
      active SMALLINT NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS streams (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      active SMALLINT NOT NULL DEFAULT 1
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      "userId" INTEGER NOT NULL REFERENCES users(id),
      today TEXT NOT NULL DEFAULT '',
      yesterday TEXT NOT NULL DEFAULT '',
      "rmComments" TEXT NOT NULL DEFAULT '',
      "blockedOn" TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(date, "userId")
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS entry_streams (
      "entryId" INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      "streamId" INTEGER NOT NULL REFERENCES streams(id),
      PRIMARY KEY ("entryId", "streamId")
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      "entryId" INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      url TEXT,
      "fileData" TEXT,
      "fileName" TEXT,
      "mimeType" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  // Migration: add bgColors if not present (idempotent)
  await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS "bgColors" TEXT NOT NULL DEFAULT '{}'`

  await sql`
    CREATE TABLE IF NOT EXISTS edit_history (
      id SERIAL PRIMARY KEY,
      "entryId" INTEGER NOT NULL REFERENCES entries(id),
      field TEXT NOT NULL,
      "oldValue" TEXT,
      "newValue" TEXT,
      "editedByUserId" INTEGER NOT NULL REFERENCES users(id),
      "editedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `
}
