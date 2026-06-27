import { NextRequest, NextResponse } from 'next/server'
import { getHistoryForEntry } from '@/db/repositories/history'
import { getSession } from '@/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getHistoryForEntry(Number(id)))
}
