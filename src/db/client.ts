import { neon } from '@neondatabase/serverless'

if (!process.env.DB_DATABASE_URL) throw new Error('DB_DATABASE_URL is not set')

export const sql = neon(process.env.DB_DATABASE_URL)
export type SqlClient = typeof sql
