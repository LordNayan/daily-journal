import { NextRequest, NextResponse } from 'next/server'
import { listAllUsers, createUser } from '@/db/repositories/users'

const VALID_ROLES = ['engineer', 'cto', 'pm', 'admin', 'ceo']
const VALID_DESIGNATIONS = ['BE', 'FE', 'PM', 'QA', 'AI', 'Design', 'DevOps', 'CTO']

export async function GET() {
  return NextResponse.json(listAllUsers())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, password, role, designation } = body

  if (!name?.trim() || !email?.trim() || !password || !role || !designation) {
    return NextResponse.json({ error: 'name, email, password, role, designation all required' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
  }
  if (!VALID_DESIGNATIONS.includes(designation)) {
    return NextResponse.json({ error: `designation must be one of: ${VALID_DESIGNATIONS.join(', ')}` }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'password must be at least 6 characters' }, { status: 400 })
  }

  try {
    const user = createUser({ name: name.trim(), email: email.trim(), password, role, designation })
    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }
}
