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
      className={`tool-btn cursor-pointer transition-all ${
        active
          ? 'bg-[#219EBC] text-white border-[#219EBC] shadow-xs font-semibold'
          : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:bg-[#F0F5F8] hover:border-[#CBD5E1]'
      }`}
      onClick={onClick}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      aria-label={label}
      aria-pressed={active}
    >
      <span>{label}</span>
      {shortcut && (
        <span
          className={`ml-1.5 text-[10px] font-mono px-1 py-0.2 rounded ${
            active ? 'bg-white/20 text-white' : 'bg-[#F6F9FA] text-[#5A6E7F]'
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

  const saveStatusBadge: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    saved: { label: 'Saved', bg: 'bg-[#EBF7FA]', text: 'text-[#219EBC]', dot: 'bg-[#219EBC]' },
    saving: { label: 'Saving...', bg: 'bg-[#FFF5E8]', text: 'text-[#FB8A0A]', dot: 'bg-[#FB8A0A] animate-pulse' },
    unsaved: { label: 'Unsaved', bg: 'bg-[#FFF5E8]', text: 'text-[#FB8A0A]', dot: 'bg-[#FB8A0A]' },
    failed: { label: 'Save failed', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  }

  const statusInfo = saveStatusBadge[saveStatus] || saveStatusBadge.saved

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[#E2E8F0] bg-white text-xs select-none shadow-2xs">
      <button
        onClick={() => router.push('/')}
        className="px-3 py-1.5 font-medium text-[#5A6E7F] hover:text-[#219EBC] bg-[#F6F9FA] hover:bg-[#EBF7FA] border border-[#E2E8F0] hover:border-[#B6E5F0] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
        title="Back to Dashboard"
      >
        ← Dashboard
      </button>

      <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#219EBC]" />
        <span className="font-bold text-sm text-[#0F172A]">{organName || 'Organ'}</span>
      </div>

      <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

      {/* Undo & Redo Toolbar Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="px-2.5 py-1.5 font-medium text-[#0F172A] border border-[#E2E8F0] rounded-lg hover:bg-[#F0F5F8] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          ↩ Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="px-2.5 py-1.5 font-medium text-[#0F172A] border border-[#E2E8F0] rounded-lg hover:bg-[#F0F5F8] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          ↪ Redo
        </button>
      </div>

      <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

      <div className="flex items-center gap-1.5">
        <ToolBtn label="Select" tool="select" shortcut="V" active={activeTool === 'select'} onClick={() => setActiveTool('select')} />
        <ToolBtn label="Pan" tool="pan" shortcut="H" active={activeTool === 'pan'} onClick={() => setActiveTool('pan')} />
        <ToolBtn label="Pin" tool="pin" shortcut="P" active={activeTool === 'pin'} onClick={() => setActiveTool('pin')} />
        <ToolBtn label="Rect" tool="rectangle" shortcut="R" active={activeTool === 'rectangle'} onClick={() => setActiveTool('rectangle')} />
        <ToolBtn label="Rel" tool="relationship" shortcut="E" active={activeTool === 'relationship'} onClick={() => setActiveTool('relationship')} />
      </div>

      <div className="flex-1" />

      {/* Status Pill */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.text} border border-current/15`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
        {statusInfo.label}
      </div>
    </div>
  )
}
