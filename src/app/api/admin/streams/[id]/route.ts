import { NextRequest, NextResponse } from 'next/server'
import { updateStream, setStreamActive } from '@/db/repositories/streams'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  if (typeof body.active === 'boolean') {
    await setStreamActive(Number(id), body.active)
    return NextResponse.json({ ok: true })
  }

  if (typeof body.name === 'string' && body.name.trim()) {
    try {
      const updated = await updateStream(Number(id), body.name.trim())
      return NextResponse.json(updated)
    } catch {
      return NextResponse.json({ error: 'Name already exists' }, { status: 409 })
    }
  }

  return NextResponse.json({ error: 'name or active required' }, { status: 400 })
}
