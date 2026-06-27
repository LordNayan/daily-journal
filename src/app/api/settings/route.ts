import { NextResponse } from 'next/server'
import { getSetting } from '@/db/repositories/settings'

// Readable by all authenticated users — middleware already ensures auth
export async function GET() {
  const rolloverTime = (await getSetting('rollover_time')) ?? '14:30'
  return NextResponse.json({ rolloverTime })
}
