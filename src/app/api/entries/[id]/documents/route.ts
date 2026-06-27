import { NextRequest, NextResponse } from 'next/server'
import { getEntry } from '@/db/repositories/entries'
import { addDocument, deleteDocument } from '@/db/repositories/documents'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entry = getEntry(Number(id))
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (session.userId !== entry.userId && session.role !== 'pm') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { label, url, fileData, fileName, mimeType } = body
  if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 })

  const doc = addDocument(Number(id), { label, url, fileData, fileName, mimeType })
  return NextResponse.json(doc, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entry = getEntry(Number(id))
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (session.userId !== entry.userId && session.role !== 'pm') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { docId } = await req.json()
  const ok = deleteDocument(docId, Number(id))
  return NextResponse.json({ ok })
}
