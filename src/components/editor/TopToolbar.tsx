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

function ToolBtn({ label, shortcut, active, onClick }: ToolBtnProps) {
  return (
    <button
      className={`tool-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      aria-label={label}
      aria-pressed={active}
    >
      <span>{label}</span>
      {shortcut && (
        <span
          className={`ml-1.5 text-[10px] font-mono px-1 py-0.2 border border-black font-bold ${
            active ? 'bg-black text-white' : 'bg-[#FFFDF5] text-black'
          }`}
        >
          {shortcut}
        </span>
      )}
    </button>
  )
}

export default function TopToolbar({ organId }: { organId: string }) {
  const router = useRouter()
  const { activeTool, setActiveTool, saveStatus, layers, undo, redo, canUndo, canRedo } = useStore()
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

  const saveStatusBadge: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    saved: { label: 'SAVED', bg: 'bg-[var(--lime)]', text: 'text-black', dot: 'bg-black' },
    saving: { label: 'SAVING...', bg: 'bg-[var(--primary)]', text: 'text-black', dot: 'bg-black animate-ping' },
    unsaved: { label: 'UNSAVED', bg: 'bg-[var(--warning)]', text: 'text-black', dot: 'bg-black' },
    failed: { label: 'SAVE FAILED', bg: 'bg-[var(--danger)]', text: 'text-white', dot: 'bg-white' },
  }

  const statusInfo = saveStatusBadge[saveStatus] || saveStatusBadge.saved

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b-2.5 border-black bg-white text-xs select-none shadow-[0_3px_0_0_#000] z-10">
      <button
        onClick={() => router.push('/')}
        className="neo-btn neo-btn-white px-3 py-1.5 text-xs font-black"
        title="Back to Dashboard"
      >
        ← DASHBOARD
      </button>

      <div className="w-0.5 h-6 bg-black mx-0.5" />

      <div className="flex items-center gap-2">
        <span className="w-3 h-3 border border-black bg-[var(--primary)]" />
        <span className="font-black text-sm text-black tracking-tight uppercase">{organName || 'ORGAN'}</span>
      </div>

      <div className="w-0.5 h-6 bg-black mx-0.5" />

      {/* Undo & Redo Toolbar Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="neo-btn neo-btn-white px-2.5 py-1.5 text-xs font-bold"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          ↩ UNDO
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="neo-btn neo-btn-white px-2.5 py-1.5 text-xs font-bold"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          ↪ REDO
        </button>
      </div>

      <div className="w-0.5 h-6 bg-black mx-0.5" />

      <div className="flex items-center gap-2">
        <ToolBtn label="Select" tool="select" shortcut="V" active={activeTool === 'select'} onClick={() => setActiveTool('select')} />
        <ToolBtn label="Pan" tool="pan" shortcut="H" active={activeTool === 'pan'} onClick={() => setActiveTool('pan')} />
        <ToolBtn label="Pin" tool="pin" shortcut="P" active={activeTool === 'pin'} onClick={() => setActiveTool('pin')} />
        <ToolBtn label="Rect" tool="rectangle" shortcut="R" active={activeTool === 'rectangle'} onClick={() => setActiveTool('rectangle')} />
        <ToolBtn label="Rel" tool="relationship" shortcut="E" active={activeTool === 'relationship'} onClick={() => setActiveTool('relationship')} />
      </div>

      <div className="flex-1" />

      {/* Status Badge */}
      <div className={`neo-badge ${statusInfo.bg} ${statusInfo.text} px-3 py-1 font-mono font-black text-[11px]`}>
        <span className={`w-2 h-2 rounded-full border border-black ${statusInfo.dot}`} />
        {statusInfo.label}
      </div>
    </div>
  )
}
