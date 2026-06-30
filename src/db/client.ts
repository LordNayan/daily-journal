import { Pool } from 'pg'

if (!process.env.DB_DATABASE_URL) throw new Error('DB_DATABASE_URL is not set')

const pool = new Pool({ connectionString: process.env.DB_DATABASE_URL })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]> {
  let text = ''
  strings.forEach((str, i) => {
    text += str
    if (i < values.length) text += `$${i + 1}`
  })
  const result = await pool.query(text, values as never[])
  return result.rows
}

export type SqlClient = typeof sql

