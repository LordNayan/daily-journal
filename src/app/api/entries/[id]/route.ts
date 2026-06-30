import { NextRequest, NextResponse } from 'next/server'
import { getEntry, updateEntryField, updateEntryStreams, updateEntryBgColors } from '@/db/repositories/entries'
import { getSession } from '@/lib/session'

function canEditField(
  session: { userId: number; role: string },
  entryUserId: number,
  field: string
): boolean {
  if (field === 'rmComments') return session.role === 'cto'
  if (['today', 'yesterday', 'blockedOn', 'streams'].includes(field)) {
    return (
      session.userId === entryUserId ||
      session.role === 'pm' ||
      session.role === 'admin' ||
      session.role === 'cto'
    )
  }
  return false
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entry = await getEntry(Number(id))
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(entry)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entry = await getEntry(Number(id))
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { field, value, streamIds, version, skipHistory, commitOldValue, bgColors } = body

  if (field === 'bgColors') {
    if (!canEditField(session, entry.userId, 'today')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!bgColors || typeof bgColors !== 'object') {
      return NextResponse.json({ error: 'bgColors object required' }, { status: 400 })
    }
    const updated = await updateEntryBgColors(Number(id), bgColors)
    return NextResponse.json(updated)
  }

  if (typeof version !== 'number') {
    return NextResponse.json({ error: 'version required' }, { status: 400 })
  }

  if (field === 'streams') {
    if (!canEditField(session, entry.userId, 'streams')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!Array.isArray(streamIds)) {
      return NextResponse.json({ error: 'streamIds required' }, { status: 400 })
    }
    const result = await updateEntryStreams(Number(id), streamIds, version, session.userId)
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Conflict', currentEntry: result.currentEntry },
        { status: 409 }
      )
    }
    return NextResponse.json(result.entry)
  }

  const allowedFields = ['today', 'yesterday', 'rmComments', 'blockedOn'] as const
  type AllowedField = (typeof allowedFields)[number]
  if (!allowedFields.includes(field as AllowedField)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }
  if (!canEditField(session, entry.userId, field)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await updateEntryField(Number(id), field as AllowedField, value ?? '', version, session.userId, {
    skipHistory: skipHistory === true,
    commitOldValue: typeof commitOldValue === 'string' ? commitOldValue : undefined,
  })
  if (!result.ok) {
    return NextResponse.json(
      { error: 'Conflict', currentEntry: result.currentEntry },
      { status: 409 }
    )
  }
  return NextResponse.json(result.entry)
}
