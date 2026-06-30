export type Role = 'engineer' | 'cto' | 'pm' | 'admin' | 'ceo'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  designation: string
  active: number
}

export interface Stream {
  id: number
  name: string
  active?: number
}

export interface Document {
  id: number
  entryId: number
  label: string
  url: string | null
  fileData: string | null
  fileName: string | null
  mimeType: string | null
  createdAt: string
}

export interface HistoryRecord {
  id: number
  entryId: number
  field: string
  oldValue: string | null
  newValue: string | null
  editedByUserId: number
  editedByName: string
  editedAt: string
}

export interface Entry {
  id: number
  date: string
  userId: number
  today: string
  yesterday: string
  rmComments: string
  blockedOn: string
  bgColors: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface EntryRow extends Entry {
  user: User
  streams: Stream[]
  documents: Document[]
}

export interface Session {
  userId: number
  role: Role
  name: string
  email: string
  designation: string
  mustChangePassword: boolean
}

export interface UpdateEntryBody {
  field: 'today' | 'yesterday' | 'rmComments' | 'blockedOn'
  value: string
  version: number
}

export interface UpdateStreamsBody {
  streamIds: number[]
  version: number
}
