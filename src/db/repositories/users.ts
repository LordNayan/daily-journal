import db from '../index'
import bcrypt from 'bcryptjs'
import type { User } from '@/types'

export function getUserByEmail(email: string): (User & { passwordHash: string; mustChangePassword: number }) | undefined {
  return db
    .prepare('SELECT id, name, email, passwordHash, role, designation, mustChangePassword, active FROM users WHERE email = ?')
    .get(email) as (User & { passwordHash: string; mustChangePassword: number }) | undefined
}

export function getUserById(id: number): User | undefined {
  return db
    .prepare('SELECT id, name, email, role, designation, active FROM users WHERE id = ?')
    .get(id) as User | undefined
}

export function listActiveUsers(): User[] {
  return db
    .prepare('SELECT id, name, email, role, designation, active FROM users WHERE active = 1 ORDER BY designation, name')
    .all() as User[]
}

export function listAllUsers(): User[] {
  return db
    .prepare('SELECT id, name, email, role, designation, active FROM users ORDER BY active DESC, designation, name')
    .all() as User[]
}

export function createUser(data: {
  name: string
  email: string
  password: string
  role: string
  designation: string
}): User {
  const hash = bcrypt.hashSync(data.password, 10)
  const r = db
    .prepare(
      'INSERT INTO users (name, email, passwordHash, role, designation, mustChangePassword) VALUES (?, ?, ?, ?, ?, 1)'
    )
    .run(data.name, data.email, hash, data.role, data.designation)
  return db
    .prepare('SELECT id, name, email, role, designation, active FROM users WHERE id = ?')
    .get(r.lastInsertRowid) as User
}

export function updateUser(
  id: number,
  data: Partial<{ name: string; email: string; role: string; designation: string }>
): User | undefined {
  const fields = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`)
    .join(', ')
  const values = Object.values(data).filter((v) => v !== undefined)
  if (!fields) return getUserById(id)
  db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values, id)
  return db
    .prepare('SELECT id, name, email, role, designation, active FROM users WHERE id = ?')
    .get(id) as User | undefined
}

export function setUserActive(id: number, active: boolean): void {
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
}

export function changePassword(userId: number, newPassword: string): void {
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE users SET passwordHash = ?, mustChangePassword = 0 WHERE id = ?').run(hash, userId)
}
