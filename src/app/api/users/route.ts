import { NextResponse } from 'next/server'
import { listActiveUsers } from '@/db/repositories/users'

export async function GET() {
  return NextResponse.json(listActiveUsers())
}
