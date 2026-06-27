'use client'

import { useEffect, useState } from 'react'
import type { Stream, User } from '@/types'

// ── Designation + role options ────────────────────────────────────────────────
const DESIGNATIONS = ['BE', 'FE', 'PM', 'QA', 'AI', 'Design', 'DevOps', 'CTO']
const ROLES = ['engineer', 'pm', 'admin', 'cto', 'ceo']

const DESIG_COLORS: Record<string, string> = {
  BE: 'bg-violet-100 text-violet-700',
  FE: 'bg-indigo-100 text-indigo-700',
  PM: 'bg-emerald-100 text-emerald-700',
  QA: 'bg-orange-100 text-orange-700',
  AI: 'bg-sky-100 text-sky-700',
  Design: 'bg-pink-100 text-pink-700',
  DevOps: 'bg-amber-100 text-amber-700',
  CTO: 'bg-red-100 text-red-700',
}

// ── Small shared components ───────────────────────────────────────────────────

function Badge({ label, colorCls }: { label: string; colorCls?: string }) {
  const cls = colorCls ?? DESIG_COLORS[label] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ── Streams tab ───────────────────────────────────────────────────────────────

function StreamsTab() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [addName, setAddName] = useState('')
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    fetch('/api/admin/streams').then(r => r.json()).then(setStreams).finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    const res = await fetch('/api/admin/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName.trim() }),
    })
    if (!res.ok) { setAddError((await res.json()).error); return }
    const s = await res.json()
    setStreams(prev => [s, ...prev])
    setAddName('')
  }

  async function handleRename(id: number) {
    const res = await fetch(`/api/admin/streams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setStreams(prev => prev.map(s => s.id === id ? updated : s))
      setEditingId(null)
    }
  }

  async function handleToggleActive(stream: Stream) {
    const nowActive = !stream.active
    await fetch(`/api/admin/streams/${stream.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: nowActive }),
    })
    setStreams(prev => prev.map(s => s.id === stream.id ? { ...s, active: nowActive ? 1 : 0 } : s))
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>

  return (
    <div className="space-y-5">
      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={addName}
          onChange={e => setAddName(e.target.value)}
          placeholder="New stream name…"
          required
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          Add stream
        </button>
      </form>
      {addError && <p className="text-xs text-red-500">{addError}</p>}

      {/* Table */}
      <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-xs text-gray-400 uppercase tracking-wide border-b">
            <th className="py-2 text-left font-semibold">Name</th>
            <th className="py-2 text-left font-semibold">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {streams.map(s => (
            <tr key={s.id} className={`border-b last:border-0 ${!s.active ? 'opacity-50' : ''}`}>
              <td className="py-2 pr-4">
                {editingId === s.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="border border-blue-400 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 flex-1"
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(s.id); if (e.key === 'Escape') setEditingId(null) }}
                    />
                    <button onClick={() => handleRename(s.id)} className="text-xs text-blue-600 hover:text-blue-800">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                  </div>
                ) : (
                  <span className="text-gray-800">{s.name}</span>
                )}
              </td>
              <td className="py-2">
                {s.active ? (
                  <span className="text-xs text-green-600 font-medium">Active</span>
                ) : (
                  <span className="text-xs text-gray-400">Inactive</span>
                )}
              </td>
              <td className="py-2 text-right space-x-3">
                <button
                  onClick={() => { setEditingId(s.id); setEditName(s.name) }}
                  className="text-xs text-gray-400 hover:text-blue-600"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleToggleActive(s)}
                  className={`text-xs ${s.active ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}
                >
                  {s.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

// ── People tab ────────────────────────────────────────────────────────────────

interface UserForm {
  name: string; email: string; password: string; role: string; designation: string
}

const EMPTY_FORM: UserForm = { name: '', email: '', password: '', role: 'engineer', designation: 'BE' }

function PeopleTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(setUsers).finally(() => setLoading(false))
  }, [])

  function openAdd() { setForm(EMPTY_FORM); setFormError(''); setShowAdd(true) }
  function openEdit(u: User) { setForm({ name: u.name, email: u.email, password: '', role: u.role, designation: u.designation }); setFormError(''); setEditUser(u) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { setFormError((await res.json()).error); return }
    const u = await res.json()
    setUsers(prev => [u, ...prev])
    setShowAdd(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setFormError('')
    const payload: Record<string, string> = { name: form.name, email: form.email, role: form.role, designation: form.designation }
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) { setFormError((await res.json()).error); return }
    const updated = await res.json()
    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...updated } : u))
    setEditUser(null)
  }

  async function handleToggleActive(user: User) {
    const nowActive = !user.active
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: nowActive }),
    })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: nowActive ? 1 : 0 } : u))
    setConfirmDeactivate(null)
  }

  const FormFields = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
          <select value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {DESIGNATIONS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Permission role</label>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      {showAdd && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Initial password <span className="text-gray-400">(person will be asked to change on first login)</span>
          </label>
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required minLength={6} placeholder="Min 6 characters"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
      {formError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={() => { setShowAdd(false); setEditUser(null) }}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
        <button type="submit" className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 font-medium">
          {showAdd ? 'Add person' : 'Save changes'}
        </button>
      </div>
    </div>
  )

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Add person
        </button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-xs text-gray-400 uppercase tracking-wide border-b">
            <th className="py-2 text-left font-semibold">Name</th>
            <th className="py-2 text-left font-semibold">Email</th>
            <th className="py-2 text-left font-semibold">Designation</th>
            <th className="py-2 text-left font-semibold">Role</th>
            <th className="py-2 text-left font-semibold">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className={`border-b last:border-0 ${!u.active ? 'opacity-50' : ''}`}>
              <td className="py-2 pr-3 font-medium text-gray-800">{u.name}</td>
              <td className="py-2 pr-3 text-gray-500 text-xs">{u.email}</td>
              <td className="py-2 pr-3">
                <Badge label={u.designation} />
              </td>
              <td className="py-2 pr-3 text-gray-500 text-xs">{u.role}</td>
              <td className="py-2 pr-3">
                {u.active ? (
                  <span className="text-xs text-green-600 font-medium">Active</span>
                ) : (
                  <span className="text-xs text-gray-400">Inactive</span>
                )}
              </td>
              <td className="py-2 text-right space-x-3 whitespace-nowrap">
                <button onClick={() => openEdit(u)} className="text-xs text-gray-400 hover:text-blue-600">Edit</button>
                {u.active ? (
                  <button onClick={() => setConfirmDeactivate(u)} className="text-xs text-red-400 hover:text-red-600">
                    Remove
                  </button>
                ) : (
                  <button onClick={() => handleToggleActive(u)} className="text-xs text-green-500 hover:text-green-700">
                    Reactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add person" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd}><FormFields /></form>
        </Modal>
      )}

      {/* Edit modal */}
      {editUser && (
        <Modal title={`Edit — ${editUser.name}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleEdit}><FormFields /></form>
        </Modal>
      )}

      {/* Deactivate confirm */}
      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Remove {confirmDeactivate.name}?</h3>
            <p className="text-sm text-gray-500">
              They won&apos;t be able to log in and won&apos;t appear in new journal rows.
              Their historical entries are preserved and can still be viewed.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeactivate(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
              <button
                onClick={() => handleToggleActive(confirmDeactivate)}
                className="text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-1.5 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [time, setTime] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => setTime(d.rolloverTime ?? '14:30'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSaved(false)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rolloverTime: time }),
    })
    if (!res.ok) { setError((await res.json()).error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>

  return (
    <div className="max-w-sm space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Daily rollover time</h3>
        <p className="text-xs text-gray-500 mb-4">
          All journal rows roll over at this time every day (UTC). Yesterday&apos;s &ldquo;Today&rdquo;
          becomes &ldquo;Yesterday&rdquo; and fields are cleared for the new day.
          After changing this, update the cron schedule in <code className="bg-gray-100 px-1 rounded">vercel.json</code> to match.
        </p>
        <form onSubmit={handleSave} className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Time (UTC)</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="mt-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Save
          </button>
          {saved && <span className="mt-5 text-xs text-green-600 font-medium">Saved ✓</span>}
          {error && <span className="mt-5 text-xs text-red-500">{error}</span>}
        </form>
      </div>

      <div className="border-t pt-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Local time reference</h3>
        <div className="space-y-1 text-xs text-gray-500">
          {time && (() => {
            const [hh, mm] = time.split(':').map(Number)
            const utcLabel = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')} UTC`
            // IST = UTC+5:30
            const istMin = hh * 60 + mm + 5 * 60 + 30
            const istH = Math.floor(istMin / 60) % 24
            const istM = istMin % 60
            // Kyiv = UTC+3 (summer) / UTC+2 (winter) — show both
            const kyivMinS = hh * 60 + mm + 3 * 60
            const kyivHS = Math.floor(kyivMinS / 60) % 24
            const kyivMS = kyivMinS % 60
            const fmt = (h: number, m: number) =>
              `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
            return (
              <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 font-mono">
                <div><span className="text-gray-400 w-28 inline-block">UTC</span>{utcLabel}</div>
                <div><span className="text-gray-400 w-28 inline-block">India (IST)</span>{fmt(istH, istM)}</div>
                <div><span className="text-gray-400 w-28 inline-block">Kyiv (summer)</span>{fmt(kyivHS, kyivMS)}</div>
                <div><span className="text-gray-400 w-28 inline-block">Kyiv (winter)</span>{fmt(Math.floor((hh * 60 + mm + 120) / 60) % 24, (hh * 60 + mm + 120) % 60)}</div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ── Top-level admin view ──────────────────────────────────────────────────────

export function AdminView() {
  const [tab, setTab] = useState<'streams' | 'people' | 'settings'>('streams')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <a href="/journal" className="text-sm text-gray-400 hover:text-gray-600">← Journal</a>
        <h1 className="text-base font-bold text-gray-900">Admin Panel</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {(['streams', 'people', 'settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {tab === 'streams' && <StreamsTab />}
          {tab === 'people' && <PeopleTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  )
}
