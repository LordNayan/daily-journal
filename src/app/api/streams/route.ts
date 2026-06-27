import { NextResponse } from 'next/server'
import { listStreams } from '@/db/repositories/streams'

export async function GET() {
  return NextResponse.json(listStreams())
}
