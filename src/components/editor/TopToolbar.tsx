'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { EditorTool } from '@/lib/store'
import JsonImportModal from '@/components/editor/JsonImportModal'
import toast from 'react-hot-toast'

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
  const { activeTool, setActiveTool, saveStatus, layers, undo, redo, canUndo, canRedo, exportOrganJSON } = useStore()
  const [organName, setOrganName] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (organName === '' && layers.length > 0) {
      fetch(`/api/organs/${organId}`).then(r => r.json()).then(d => {
        if (d.name) setOrganName(d.name)
      })
    }
  }, [organId, layers, organName])

  const handleExportJSON = async () => {
    try {
      setIsExporting(true)
      const data = await exportOrganJSON(organId)
      if (data) {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`
        const downloadAnchor = document.createElement('a')
        downloadAnchor.setAttribute('href', jsonString)
        downloadAnchor.setAttribute('download', `${(organName || 'organ').toLowerCase().replace(/\s+/g, '_')}_mental_model.json`)
        document.body.appendChild(downloadAnchor)
        downloadAnchor.click()
        downloadAnchor.remove()
        toast.success('Organ exported to JSON!')
      } else {
        toast.error('Failed to export JSON')
      }
    } catch {
      toast.error('Export error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

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
    <>
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

        <div className="w-0.5 h-6 bg-black mx-0.5" />

        {/* JSON Load / Export Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="neo-btn neo-btn-primary px-3 py-1.5 text-xs font-black flex items-center gap-1"
            title="Load contents from JSON file or text"
          >
            📥 LOAD JSON
          </button>
          <button
            onClick={handleExportJSON}
            disabled={isExporting}
            className="neo-btn neo-btn-white px-3 py-1.5 text-xs font-bold flex items-center gap-1"
            title="Export model contents to JSON file"
          >
            📤 EXPORT JSON
          </button>
        </div>

        <div className="flex-1" />

        {/* Status Badge */}
        <div className={`neo-badge ${statusInfo.bg} ${statusInfo.text} px-3 py-1 font-mono font-black text-[11px]`}>
          <span className={`w-2 h-2 rounded-full border border-black ${statusInfo.dot}`} />
          {statusInfo.label}
        </div>
      </div>

      <JsonImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </>
  )
}
