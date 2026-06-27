export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

export function SaveStatus({ state }: { state: SaveState }) {
  if (state === 'idle') return null

  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
        <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Saving…
      </span>
    )
  }

  const map: Record<Exclude<SaveState, 'idle' | 'saving'>, { label: string; cls: string }> = {
    saved:    { label: '✓ Saved',     cls: 'text-green-600' },
    error:    { label: '✗ Error',     cls: 'text-red-500' },
    conflict: { label: '⚠ Conflict!', cls: 'text-amber-600 font-semibold' },
  }
  const { label, cls } = map[state]
  return <span className={`text-xs ${cls} whitespace-nowrap`}>{label}</span>
}
