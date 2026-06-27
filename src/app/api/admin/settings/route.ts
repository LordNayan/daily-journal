import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting } from '@/db/repositories/settings'

export async function GET() {
  const rolloverTime = getSetting('rollover_time') ?? '14:30'
  return NextResponse.json({ rolloverTime })
}

export async function PATCH(req: NextRequest) {
  const { rolloverTime } = await req.json()
  if (typeof rolloverTime !== 'string' || !/^\d{2}:\d{2}$/.test(rolloverTime)) {
    return NextResponse.json({ error: 'rolloverTime must be HH:MM (UTC)' }, { status: 400 })
  }
  const [h, m] = rolloverTime.split(':').map(Number)
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
  }
  setSetting('rollover_time', rolloverTime)
  return NextResponse.json({ ok: true, rolloverTime })
}
