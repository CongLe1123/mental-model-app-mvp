'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface JsonImportModalProps {
  isOpen: boolean
  onClose: () => void
}

const SAMPLE_HEART_MODEL = {
  version: '1.0',
  organ: {
    name: 'Heart Mental Model (Sample)',
    description: 'Sample anatomical and pathophysiological mental model of the human heart.',
  },
  layers: [
    { name: 'Normal Heart Anatomy', order: 0 },
    { name: 'Hypertrophied State', order: 1 },
  ],
  nodes: [
    { title: 'Left Ventricle', category: 'Anatomy', shortDefinition: 'Main pumping chamber of systemic circulation' },
    { title: 'Aortic Valve', category: 'Anatomy', shortDefinition: 'Semilunar valve between LV and aorta' },
    { title: 'Increased Afterload', category: 'Physiology', shortDefinition: 'Elevated systemic vascular resistance' },
    { title: 'Concentric Hypertrophy', category: 'Pathology', shortDefinition: 'Thickening of ventricular wall in response to pressure overload' },
  ],
  annotations: [
    { type: 'RECTANGLE', x: 100, y: 150, width: 140, height: 100 },
    { type: 'PIN', x: 300, y: 200 },
    { type: 'PIN', x: 450, y: 120 },
    { type: 'RECTANGLE', x: 250, y: 320, width: 160, height: 90 },
  ],
  relationships: [
    { type: 'PART_OF', lens: 'HIERARCHY', label: 'contains' },
    { type: 'CAUSES', lens: 'MECHANISM_FUNCTION', label: 'drives' },
    { type: 'EVOLVES_TO', lens: 'STATE', label: 'leads to hypertrophy' },
  ],
  reasoningPaths: [
    {
      name: 'Hypertension to LV Hypertrophy Path',
      description: 'Causal progression of chronic pressure overload resulting in hypertrophy',
      guidingQuestion: 'How does elevated pressure lead to myocardial wall thickening?',
      steps: [
        { order: 0, explanation: 'Increased systemic pressure demands higher LV ejection force' },
        { order: 1, explanation: 'Myocardial sarcomerogenesis increases wall thickness' },
      ],
    },
  ],
  hyperedges: [],
  evidence: [],
}

export default function JsonImportModal({ isOpen, onClose }: JsonImportModalProps) {
  const router = useRouter()
  const { importOrganJSON } = useStore()
  const [jsonText, setJsonText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  if (!isOpen) return null

  const handleProcessImport = async (jsonString: string) => {
    try {
      setIsImporting(true)
      const parsed = JSON.parse(jsonString)
      const organ = await importOrganJSON(parsed)
      if (organ) {
        toast.success(`Successfully imported "${organ.name}"!`)
        onClose()
        router.push(`/organs/${organ.id}`)
      } else {
        toast.error('Failed to import Organ from JSON')
      }
    } catch (e: any) {
      toast.error(`Invalid JSON: ${e.message || 'Syntax error'}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      if (content) {
        setJsonText(content)
        handleProcessImport(content)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const content = evt.target?.result as string
        if (content) {
          setJsonText(content)
          handleProcessImport(content)
        }
      }
      reader.readAsText(file)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="neo-container bg-white w-full max-w-xl p-6 space-y-4 shadow-[8px_8px_0px_#000] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <h2 className="text-base font-black uppercase text-black flex items-center gap-2">
            <span className="w-3.5 h-3.5 border border-black bg-[var(--primary)]" />
            LOAD MENTAL MODEL FROM JSON
          </h2>
          <button
            onClick={onClose}
            className="neo-btn neo-btn-white px-2.5 py-1 text-xs font-black"
          >
            ✕
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-3 border-dashed p-6 text-center transition-colors cursor-pointer ${
            isDragOver ? 'border-black bg-[var(--primary)]/20' : 'border-black bg-[#FFFDF5]'
          }`}
        >
          <div className="w-10 h-10 mx-auto mb-2 bg-[var(--secondary)] border-2 border-black flex items-center justify-center text-black font-black text-xl shadow-[2px_2px_0px_#000]">
            📁
          </div>
          <p className="text-xs font-black uppercase text-black">DRAG & DROP JSON FILE HERE</p>
          <p className="text-[11px] font-bold text-[#555] mt-1">or click button below to select file</p>
          <label className="mt-3 inline-block">
            <span className="neo-btn neo-btn-primary px-4 py-1.5 text-xs font-black cursor-pointer">
              CHOOSE JSON FILE
            </span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Textarea Paste */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-black block">OR PASTE JSON CODE DIRECTLY</label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Paste raw JSON structure here..."
            className="neo-input w-full p-3 font-mono text-xs h-36 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-black">
          <button
            onClick={() => {
              const sampleStr = JSON.stringify(SAMPLE_HEART_MODEL, null, 2)
              setJsonText(sampleStr)
              handleProcessImport(sampleStr)
            }}
            disabled={isImporting}
            className="neo-btn neo-btn-secondary px-3.5 py-2 text-xs font-black"
          >
            ⚡ LOAD SAMPLE MODEL
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="neo-btn neo-btn-white px-4 py-2 text-xs font-bold"
            >
              CANCEL
            </button>
            <button
              onClick={() => handleProcessImport(jsonText)}
              disabled={!jsonText.trim() || isImporting}
              className="neo-btn neo-btn-accent px-5 py-2 text-xs font-black"
            >
              {isImporting ? 'IMPORTING...' : 'IMPORT JSON'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
