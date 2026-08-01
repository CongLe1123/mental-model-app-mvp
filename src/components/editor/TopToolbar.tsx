'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { EditorTool } from '@/lib/store'

interface ToolBtnProps {
  label: string
  tool: EditorTool | string
  shortcut?: string
  active?: boolean
  onClick: () => void
}

function ToolBtn({ label, tool, shortcut, active, onClick }: ToolBtnProps) {
  return (
    <button
      className={`tool-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      aria-label={label}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

export default function TopToolbar({ organId }: { organId: string }) {
  const router = useRouter()
  const { activeTool, setActiveTool, activeLens, setActiveLens, saveStatus, layers, undo, redo, canUndo, canRedo } = useStore()
  const [organName, setOrganName] = useState('')

  useEffect(() => {
    if (organName === '' && layers.length > 0) {
      fetch(`/api/organs/${organId}`).then(r => r.json()).then(d => {
        if (d.name) setOrganName(d.name)
      })
    }
  }, [organId, layers, organName])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    // Ctrl+Z / Cmd+Z / Ctrl+Shift+Z / Cmd+Shift+Z Undo and Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      if (e.shiftKey) {
        redo()
      } else {
        undo()
      }
      return
    }

    if (e.key === 'v' || e.key === 'V') setActiveTool('select')
    else if (e.key === 'h' || e.key === 'H' || e.key === ' ') setActiveTool('pan')
    else if (e.key === 'p' || e.key === 'P') setActiveTool('pin')
    else if (e.key === 'r' || e.key === 'R') setActiveTool('rectangle')
    else if (e.key === 'e' || e.key === 'E') setActiveTool('relationship')
    else if (e.key === 'Escape') setActiveTool('select')
  }, [setActiveTool, undo, redo])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const saveStatusColors: Record<string, string> = {
    saved: 'text-[var(--success)]',
    saving: 'text-[var(--warning)]',
    unsaved: 'text-[var(--warning)]',
    failed: 'text-[var(--danger)]',
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface)] text-sm">
      <button
        onClick={() => router.push('/')}
        className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface-hover)]"
        title="Back to Dashboard"
      >
        ← Dashboard
      </button>

      <span className="font-medium ml-2">{organName || 'Organ'}</span>

      <div className="w-px h-5 bg-[var(--border)] mx-1" />

      {/* Undo & Redo Toolbar Buttons */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        ↩ Undo
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        ↪ Redo
      </button>

      <div className="w-px h-5 bg-[var(--border)] mx-1" />

      <ToolBtn label="Select" tool="select" shortcut="V" active={activeTool === 'select'} onClick={() => setActiveTool('select')} />
      <ToolBtn label="Pan" tool="pan" shortcut="H" active={activeTool === 'pan'} onClick={() => setActiveTool('pan')} />
      <ToolBtn label="Pin" tool="pin" shortcut="P" active={activeTool === 'pin'} onClick={() => setActiveTool('pin')} />
      <ToolBtn label="Rect" tool="rectangle" shortcut="R" active={activeTool === 'rectangle'} onClick={() => setActiveTool('rectangle')} />
      <ToolBtn label="Rel" tool="relationship" shortcut="E" active={activeTool === 'relationship'} onClick={() => setActiveTool('relationship')} />

      <div className="w-px h-5 bg-[var(--border)] mx-1" />

      <span className={`text-xs font-medium ${saveStatusColors[saveStatus]}`}>
        {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Save failed'}
      </span>

      <div className="flex-1" />
    </div>
  )
}
