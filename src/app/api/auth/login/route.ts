import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserByEmail } from '@/db/repositories/users'
import { signSession, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await getUserByEmail(email)
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const mustChangePassword = !!user.mustChangePassword

    const token = await signSession({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      designation: user.designation,
      mustChangePassword,
    })

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, role: user.role, designation: user.designation, mustChangePassword },
    })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
