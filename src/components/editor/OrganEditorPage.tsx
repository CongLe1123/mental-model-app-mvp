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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 bg-[#FFFDF5]">
        <div className="neo-container p-8 max-w-md bg-white text-center space-y-4 shadow-[6px_6px_0px_#000]">
          <h2 className="text-xl font-black uppercase text-[var(--danger)]">FAILED TO LOAD ORGAN</h2>
          <p className="text-xs font-bold text-black">{loadError}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => { setLoadError(null); loadOrganData(organId) }} className="neo-btn neo-btn-primary px-5 py-2 text-xs font-black">
              RETRY
            </button>
            <button onClick={() => router.push('/')} className="neo-btn neo-btn-white px-5 py-2 text-xs font-bold">
              BACK TO DASHBOARD
            </button>
          </div>
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
