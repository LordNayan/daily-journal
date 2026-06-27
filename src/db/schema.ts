import type Database from 'better-sqlite3'

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('engineer','cto','pm','admin','ceo')),
      designation TEXT NOT NULL DEFAULT '',
      mustChangePassword INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      userId INTEGER NOT NULL REFERENCES users(id),
      today TEXT NOT NULL DEFAULT '',
      yesterday TEXT NOT NULL DEFAULT '',
      rmComments TEXT NOT NULL DEFAULT '',
      blockedOn TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, userId)
    );

    CREATE TABLE IF NOT EXISTS entry_streams (
      entryId INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      streamId INTEGER NOT NULL REFERENCES streams(id),
      PRIMARY KEY (entryId, streamId)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entryId INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      url TEXT,
      fileData TEXT,
      fileName TEXT,
      mimeType TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS edit_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entryId INTEGER NOT NULL REFERENCES entries(id),
      field TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT,
      editedByUserId INTEGER NOT NULL REFERENCES users(id),
      editedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}
