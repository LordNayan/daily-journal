import { NextRequest, NextResponse } from 'next/server'
import { runRollover } from '@/db/repositories/entries'
import { getSession } from '@/lib/session'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  // Allow Vercel cron (sends Authorization header) or authenticated pm/admin users
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'pm' && session.role !== 'admin' && session.role !== 'cto') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const date = (body as Record<string, string>).date ?? todayStr()
  const created = await runRollover(date)
  return NextResponse.json({ ok: true, date, created })
}
