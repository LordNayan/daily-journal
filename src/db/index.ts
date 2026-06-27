import Database from 'better-sqlite3'
import { initSchema } from './schema'
import { seedDatabase } from './seed'

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined
}

function createDB(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  seedDatabase(db)
  return db
}

// Reuse the same instance across Next.js hot reloads in development
const db: Database.Database = globalThis.__db ?? createDB()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = db
}

export default db
