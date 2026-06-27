import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { changePassword } from '@/db/repositories/users'
import { signSession, COOKIE_NAME } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { newPassword } = await req.json()
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  await changePassword(session.userId, newPassword)

  // Re-issue token with mustChangePassword = false
  const newToken = await signSession({ ...session, mustChangePassword: false })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
