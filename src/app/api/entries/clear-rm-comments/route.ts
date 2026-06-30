import { NextRequest, NextResponse } from 'next/server'
import { clearRmCommentsForDate } from '@/db/repositories/entries'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'cto') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { date } = body as { date?: string }
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const cleared = await clearRmCommentsForDate(date)
  return NextResponse.json({ ok: true, cleared })
}
