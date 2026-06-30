import postgres from 'postgres'

if (!process.env.DB_DATABASE_URL) throw new Error('DB_DATABASE_URL is not set')

// Singleton to avoid exhausting connections during Next.js hot reload in dev
const globalForSql = globalThis as typeof globalThis & { _sql?: postgres.Sql }
export const sql = globalForSql._sql ?? postgres(process.env.DB_DATABASE_URL)
if (process.env.NODE_ENV !== 'production') globalForSql._sql = sql

export type SqlClient = typeof sql
