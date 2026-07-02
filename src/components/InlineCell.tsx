'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import type { Editor } from '@tiptap/core'
import { SaveStatus, type SaveState } from './SaveStatus'
import { ConflictModal } from './ConflictModal'
import type { EntryRow } from '@/types'

interface Props {
  entryId: number
  field: 'today' | 'yesterday' | 'rmComments' | 'blockedOn'
  initialValue: string
  version: number
  readOnly?: boolean
  placeholder?: string
  highlight?: boolean
  bgColor?: string | null
  onBgColorChange?: (color: string | null) => void
  onVersionUpdate: (newVersion: number) => void
  onServerUpdate: (updated: EntryRow) => void
}

const EMOJIS = [
  '😀', '😂', '😊', '😍', '🤔', '😢', '😡', '👍', '👎', '🙏',
  '👏', '🎉', '🔥', '💯', '✅', '❌', '⚠️', '🚀', '💡', '📌',
  '⏳', '🐛', '🚧',
]

const BG_COLORS: { label: string; value: string | null }[] = [
  { label: 'Clear', value: null },
  { label: 'Yellow', value: '#fef9c3' },
  { label: 'Amber', value: '#fef3c7' },
  { label: 'Orange', value: '#ffedd5' },
  { label: 'Green', value: '#dcfce7' },
  { label: 'Blue', value: '#dbeafe' },
  { label: 'Violet', value: '#ede9fe' },
  { label: 'Pink', value: '#fce7f3' },
  { label: 'Red', value: '#fee2e2' },
  { label: 'Slate', value: '#f1f5f9' },
]

// Tiptap always starts output with a block-level tag. Only treat as HTML if it matches that.
const TIPTAP_BLOCK_RE = /^<(p|ul|ol|h[1-6]|blockquote|pre)[\s>]/i

function toHtml(value: string): string {
  if (!value) return ''
  if (TIPTAP_BLOCK_RE.test(value.trimStart())) return value
  return value
    .split('\n')
    .map((line) => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `<p>${escaped || '<br>'}</p>`
    })
    .join('')
}

export function InlineCell({
  entryId,
  field,
  initialValue,
  version,
  readOnly,
  placeholder,
  highlight,
  bgColor,
  onBgColorChange,
  onVersionUpdate,
  onServerUpdate,
}: Props) {
  const [value, setValue] = useState(() => toHtml(initialValue))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [conflict, setConflict] = useState<{ serverEntry: EntryRow } | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const versionRef = useRef(version)
  const savedRef = useRef(toHtml(initialValue))
  const savingRef = useRef<string | null>(null)
  const focusValueRef = useRef(toHtml(initialValue))
  const saveStateRef = useRef<SaveState>('idle')
  const editorRef = useRef<Editor | null>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    versionRef.current = version
  }, [version])

  useEffect(() => {
    const html = toHtml(initialValue)
    setValue(html)
    savedRef.current = html
    editorRef.current?.commands.setContent(html, { emitUpdate: false })
  }, [initialValue])

  useEffect(() => {
    if (!showColorPicker) return
    function handleClick(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showColorPicker])

  useEffect(() => {
    if (!showEmojiPicker) return
    function handleClick(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showEmojiPicker])

  function updateSaveState(s: SaveState) {
    saveStateRef.current = s
    setSaveState(s)
  }

  const save = useCallback(
    async (val: string, ver: number, commit = false, focusVal?: string) => {
      const unchanged = val === savedRef.current
      if (unchanged && !commit) return
      if (unchanged && commit && focusVal === val) return
      if (savingRef.current === val && !commit) return
      savingRef.current = val
      updateSaveState('saving')
      try {
        const res = await fetch(`/api/entries/${entryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field, value: val, version: ver,
            skipHistory: !commit,
            ...(commit && focusVal !== undefined ? { commitOldValue: focusVal } : {}),
          }),
        })

        if (res.status === 409) {
          const data = await res.json()
          updateSaveState('conflict')
          setConflict({ serverEntry: data.currentEntry })
          return
        }

        if (!res.ok) { updateSaveState('error'); return }

        const updated: EntryRow = await res.json()
        savedRef.current = val
        versionRef.current = updated.version
        onVersionUpdate(updated.version)
        onServerUpdate(updated)
        updateSaveState('saved')
        setTimeout(() => updateSaveState('idle'), 2000)
      } catch {
        updateSaveState('error')
      } finally {
        savingRef.current = null
      }
    },
    [entryId, field, onVersionUpdate, onServerUpdate]
  )

  function handleChange(html: string) {
    setValue(html)
    if (saveStateRef.current === 'saved' || saveStateRef.current === 'error') {
      updateSaveState('idle')
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(html, versionRef.current), 1500)
  }

  function handleBlur(html: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const needsCommit = html !== focusValueRef.current
    save(html, versionRef.current, needsCommit, focusValueRef.current)
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Underline],
    content: toHtml(initialValue),
    editorProps: {
      attributes: {
        class: `rich-text outline-none min-h-[24px] text-sm px-1 py-0.5 ${highlight ? 'font-medium' : ''}`,
      },
    },
    onUpdate: ({ editor: e }) => {
      editorRef.current = e
      handleChange(e.getHTML())
    },
    onBlur: ({ editor: e }) => {
      setIsFocused(false)
      handleBlur(e.getHTML())
    },
    onFocus: () => {
      setIsFocused(true)
      focusValueRef.current = savedRef.current
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e
    },
  })

  if (readOnly) {
    return (
      <div
        className={`text-sm text-gray-700 min-h-[20px] rich-text ${highlight ? 'font-medium' : ''}`}
        style={bgColor ? { backgroundColor: bgColor, borderRadius: 4, padding: '2px 4px' } : undefined}
        dangerouslySetInnerHTML={{ __html: value || '<span style="color:#d1d5db">—</span>' }}
      />
    )
  }

  return (
    <div
      className={`relative group w-full min-h-[48px] cursor-text rounded transition-all
        hover:ring-1 hover:ring-blue-100 hover:bg-blue-50/20
        ${saveState === 'conflict' ? 'ring-2 ring-amber-400' : ''}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      onClick={() => editor?.commands.focus()}
    >
      {/* Formatting toolbar — visible when editor is focused */}
      {isFocused && editor && (
        <div className="flex items-center gap-0.5 px-1 pt-1 pb-0.5 border-b border-gray-100">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <u>U</u>
          </ToolbarButton>
          <div className="w-px h-3 bg-gray-200 mx-0.5" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <span className="text-[10px]">≡</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
            <span className="text-[10px]">1.</span>
          </ToolbarButton>
          <div className="w-px h-3 bg-gray-200 mx-0.5" />
          <div ref={emojiPickerRef} className="relative">
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowEmojiPicker((v) => !v) }}
              className="text-gray-400 hover:text-gray-600 text-xs px-1 py-0.5 rounded hover:bg-gray-100 leading-none"
              title="Insert emoji"
            >
              🙂
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-6 bg-white border border-gray-200 rounded-lg shadow-xl p-2 flex flex-wrap gap-1 w-[168px] z-20">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      editor.chain().focus().insertContent(emoji).run()
                      setShowEmojiPicker(false)
                    }}
                    className="w-7 h-7 rounded hover:bg-gray-100 text-base leading-none flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          {onBgColorChange && (
            <>
              <div className="w-px h-3 bg-gray-200 mx-0.5" />
              <div ref={colorPickerRef} className="relative">
                <button
                  onMouseDown={(e) => { e.preventDefault(); setShowColorPicker((v) => !v) }}
                  className="text-gray-400 hover:text-gray-600 text-xs px-1 py-0.5 rounded hover:bg-gray-100 leading-none"
                  title="Cell background color"
                >
                  🎨
                </button>
                {showColorPicker && (
                  <div className="absolute left-0 top-6 bg-white border border-gray-200 rounded-lg shadow-xl p-2 flex flex-wrap gap-1 w-[116px] z-20">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c.label}
                        title={c.label}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          onBgColorChange(c.value)
                          setShowColorPicker(false)
                        }}
                        className={`w-7 h-7 rounded border-2 transition-all ${
                          bgColor === c.value ? 'border-blue-500 scale-110' : 'border-gray-200 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: c.value ?? '#ffffff' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Placeholder */}
      {editor?.isEmpty && !isFocused && placeholder && (
        <div className="text-gray-300 text-sm px-1 py-0.5 pointer-events-none select-none">
          {placeholder}
        </div>
      )}

      <div className="pb-5">
        <EditorContent editor={editor} />
      </div>

      <div className="absolute bottom-0 right-0">
        <SaveStatus state={saveState} />
      </div>


      {conflict && (
        <ConflictModal
          field={field}
          myValue={value}
          serverEntry={conflict.serverEntry}
          onClose={() => { setConflict(null); updateSaveState('idle') }}
          onUseServer={() => {
            const serverVal = conflict.serverEntry[field as keyof EntryRow] as string
            const serverHtml = toHtml(serverVal)
            setValue(serverHtml)
            savedRef.current = serverHtml
            editorRef.current?.commands.setContent(serverHtml, { emitUpdate: false })
            versionRef.current = conflict.serverEntry.version
            onVersionUpdate(conflict.serverEntry.version)
            onServerUpdate(conflict.serverEntry)
            setConflict(null)
            updateSaveState('idle')
          }}
          onKeepMine={(serverVersion) => {
            versionRef.current = serverVersion
            setConflict(null)
            updateSaveState('idle')
            save(value, serverVersion)
          }}
        />
      )}
    </div>
  )
}

function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}
