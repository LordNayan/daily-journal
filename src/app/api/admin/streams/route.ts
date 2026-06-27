import { NextRequest, NextResponse } from 'next/server'
import { listAllStreams, createStream } from '@/db/repositories/streams'

export async function GET() {
  return NextResponse.json(listAllStreams())
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  try {
    const stream = createStream(name.trim())
    return NextResponse.json(stream, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Stream name already exists' }, { status: 409 })
  }
}
