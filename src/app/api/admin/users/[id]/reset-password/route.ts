import { NextRequest, NextResponse } from 'next/server'
import { resetPassword } from '@/db/repositories/users'
import { getSession } from '@/lib/session'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'cto')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tempPassword = await resetPassword(Number(id))
  return NextResponse.json({ tempPassword })
}
