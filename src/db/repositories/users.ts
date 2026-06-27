import { sql, ensureReady } from '../index'
import bcrypt from 'bcryptjs'
import type { User } from '@/types'

export async function getUserByEmail(email: string): Promise<(User & { passwordHash: string; mustChangePassword: number }) | undefined> {
  await ensureReady()
  const rows = await sql`
    SELECT id, name, email, "passwordHash", role, designation, "mustChangePassword", active
    FROM users WHERE email = ${email}
  `
  return rows[0] as (User & { passwordHash: string; mustChangePassword: number }) | undefined
}

export async function getUserById(id: number): Promise<User | undefined> {
  await ensureReady()
  const rows = await sql`SELECT id, name, email, role, designation, active FROM users WHERE id = ${id}`
  return rows[0] as User | undefined
}

export async function listActiveUsers(): Promise<User[]> {
  await ensureReady()
  return (await sql`SELECT id, name, email, role, designation, active FROM users WHERE active = 1 ORDER BY designation, name`) as User[]
}

export async function listAllUsers(): Promise<User[]> {
  await ensureReady()
  return (await sql`SELECT id, name, email, role, designation, active FROM users ORDER BY active DESC, designation, name`) as User[]
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: string
  designation: string
}): Promise<User> {
  await ensureReady()
  const hash = bcrypt.hashSync(data.password, 10)
  const rows = await sql`
    INSERT INTO users (name, email, "passwordHash", role, designation, "mustChangePassword")
    VALUES (${data.name}, ${data.email}, ${hash}, ${data.role}, ${data.designation}, 1)
    RETURNING id, name, email, role, designation, active
  `
  return rows[0] as User
}

export async function updateUser(
  id: number,
  data: Partial<{ name: string; email: string; role: string; designation: string }>
): Promise<User | undefined> {
  await ensureReady()
  const entries = Object.entries(data).filter(([, v]) => v !== undefined)
  if (!entries.length) return getUserById(id)
  const setClauses = entries.map(([k], i) => `"${k}" = $${i + 1}`).join(', ')
  const values = [...entries.map(([, v]) => v), id]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (sql as any)(`UPDATE users SET ${setClauses} WHERE id = $${values.length} RETURNING id, name, email, role, designation, active`, values)
  return rows[0] as User | undefined
}

export async function setUserActive(id: number, active: boolean): Promise<void> {
  await ensureReady()
  await sql`UPDATE users SET active = ${active ? 1 : 0} WHERE id = ${id}`
}

export async function changePassword(userId: number, newPassword: string): Promise<void> {
  await ensureReady()
  const hash = bcrypt.hashSync(newPassword, 10)
  await sql`UPDATE users SET "passwordHash" = ${hash}, "mustChangePassword" = 0 WHERE id = ${userId}`
}
