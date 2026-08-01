'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import TopToolbar from '@/components/editor/TopToolbar'
import LayerPanel from '@/components/editor/LayerPanel'
import EditorCanvas from '@/components/editor/EditorCanvas'
import InspectorPanel from '@/components/editor/InspectorPanel'
import KnowledgePanel from '@/components/editor/KnowledgePanel'

export default function OrganEditorPage() {
  const params = useParams()
  const router = useRouter()
  const organId = params.id as string
  const { loadOrganData, loadError, setLoadError } = useStore()

  useEffect(() => {
    if (organId) {
      loadOrganData(organId).catch(() => {})
    }
  }, [organId, loadOrganData])

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <p className="text-lg font-medium text-[var(--danger)]">Failed to load organ</p>
        <p className="text-sm text-[var(--text-muted)]">{loadError}</p>
        <div className="flex gap-3">
          <button onClick={() => { setLoadError(null); loadOrganData(organId) }} className="px-4 py-2 bg-[var(--accent)] text-white rounded-md text-sm">
            Retry
          </button>
          <button onClick={() => router.push('/')} className="px-4 py-2 border rounded-md text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-grid">
      <TopToolbar organId={organId} />
      <div className="editor-main">
        <LayerPanel />
        <EditorCanvas />
        <InspectorPanel />
      </div>
      <KnowledgePanel />
    </div>
  )
}
