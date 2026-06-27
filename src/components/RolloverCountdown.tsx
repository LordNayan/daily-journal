'use client'

import { useEffect, useState } from 'react'

interface Props {
  rolloverTime: string // "HH:MM" UTC
}

function getNextRollover(hhmm: string): Date {
  const [hh, mm] = hhmm.split(':').map(Number)
  const now = new Date()
  const next = new Date()
  next.setUTCHours(hh, mm, 0, 0)
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
  return next
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatUTC(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm} UTC`
}

function formatLocal(next: Date): string {
  return next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
}

function isToday(next: Date): boolean {
  const now = new Date()
  return next.toDateString() === now.toDateString()
}

export function RolloverCountdown({ rolloverTime }: Props) {
  const [countdown, setCountdown] = useState('')
  const [localTime, setLocalTime] = useState('')
  const [dayLabel, setDayLabel] = useState('')
  const [imminent, setImminent] = useState(false)

  useEffect(() => {
    function tick() {
      const next = getNextRollover(rolloverTime)
      const ms = next.getTime() - Date.now()
      setCountdown(formatCountdown(ms))
      setLocalTime(formatLocal(next))
      setDayLabel(isToday(next) ? 'Today' : 'Tomorrow')
      setImminent(ms < 5 * 60 * 1000) // < 5 minutes
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [rolloverTime])

  if (!countdown) return null

  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        imminent
          ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-gray-50 border-gray-200 text-gray-500'
      }`}
      title={`Rollover: ${localTime} (your local time)`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${imminent ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'}`} />
      <span>
        Rollover {dayLabel.toLowerCase()} at{' '}
        <span className="font-medium">{formatUTC(rolloverTime)}</span>
        {' · '}
        <span className={imminent ? 'font-semibold' : ''}>in {countdown}</span>
        {' '}
        <span className="text-gray-400 hidden sm:inline">({localTime})</span>
      </span>
    </div>
  )
}
