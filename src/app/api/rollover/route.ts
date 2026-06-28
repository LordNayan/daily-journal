import { NextRequest, NextResponse } from 'next/server'
import { runRollover } from '@/db/repositories/entries'
import { getSetting } from '@/db/repositories/settings'
import { getSession } from '@/lib/session'

function tomorrowStr() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().split('T')[0]
}

// Returns true if current UTC time falls within the 30-min window starting at storedTime.
// e.g. storedTime "11:30" → triggers when UTC time is 11:30–11:59.
function isRolloverWindow(storedTime: string): boolean {
  const [targetH, targetM] = storedTime.split(':').map(Number)
  const now = new Date()
  const diffMin = (now.getUTCHours() * 60 + now.getUTCMinutes()) - (targetH * 60 + targetM)
  return diffMin >= 0 && diffMin < 30
}

export async function POST(req: NextRequest) {
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
  const explicitDate = (body as Record<string, string>).date

  // Cron calls have no explicit date — gate on the stored rollover time
  if (isCron && !explicitDate) {
    const storedTime = (await getSetting('rollover_time')) ?? '11:30'
    if (!isRolloverWindow(storedTime)) {
      return NextResponse.json({ skipped: true, reason: 'outside rollover window' })
    }
  }

  const date = explicitDate ?? tomorrowStr()
  const created = await runRollover(date)
  return NextResponse.json({ ok: true, date, created })
}
