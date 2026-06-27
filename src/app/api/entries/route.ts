import { NextRequest, NextResponse } from 'next/server'
import { listEntriesForDate, runRollover, getLastRolloverDate } from '@/db/repositories/entries'
import { getSession } from '@/lib/session'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = req.nextUrl.searchParams.get('date') ?? todayStr()
  const today = todayStr()

  // Lazy rollover: if querying today and rollover hasn't run yet, do it now
  if (date === today) {
    const lastRollover = getLastRolloverDate()
    if (lastRollover !== today) {
      runRollover(today)
    }
  }

  const entries = listEntriesForDate(date)
  return NextResponse.json(entries)
}
