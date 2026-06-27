import { NextRequest, NextResponse } from 'next/server'
import { updateUser, setUserActive, getUserById } from '@/db/repositories/users'
import { getSession } from '@/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const userId = Number(id)

  // Prevent self-demotion
  if (session && session.userId === userId) {
    const body = await req.json()
    if (body.active === false) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
    }
    if (body.role && body.role !== session.role) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }
    const updated = await updateUser(userId, body)
    return NextResponse.json(updated)
  }

  const body = await req.json()

  if (typeof body.active === 'boolean') {
    if (!await getUserById(userId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await setUserActive(userId, body.active)
    return NextResponse.json({ ok: true })
  }

  try {
    const updated = await updateUser(userId, {
      name: body.name,
      email: body.email,
      role: body.role,
      designation: body.designation,
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }
}
