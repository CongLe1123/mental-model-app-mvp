'use client'

import { useState, useMemo, useRef } from 'react'
import { useStore } from '@/lib/store'
import type { DeleteImpact } from '@/lib/types'

export default function InspectorPanel() {
  const {
    activeLayerId, layers,
    selectedNodeId, nodes, setSelectedNodeId,
    setSelectedAnnotationId,
    updateNode, updateLayer,
    deleteNode,
    getDeleteImpact,
  } = useStore()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [impact, setImpact] = useState<DeleteImpact | null>(null)

  const activeLayer = layers.find(l => l.id === activeLayerId)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const handleScaleChange = (layerId: string, alignScale: number) => {
    // Instant optimistic update in Zustand store for zero-latency slider rendering
    useStore.setState({
      layers: layers.map(l => l.id === layerId ? { ...l, alignScale } : l)
    })

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateLayer(layerId, { alignScale })
    }, 300)
  }

  const handleOffsetXChange = (layerId: string, alignX: number) => {
    useStore.setState({
      layers: layers.map(l => l.id === layerId ? { ...l, alignX } : l)
    })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateLayer(layerId, { alignX })
    }, 300)
  }

  const handleOffsetYChange = (layerId: string, alignY: number) => {
    useStore.setState({
      layers: layers.map(l => l.id === layerId ? { ...l, alignY } : l)
    })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateLayer(layerId, { alignY })
    }, 300)
  }

  const nodeForm = useMemo(() => {
    if (!selectedNodeId) return {} as Record<string, string>
    const node = nodes.find(n => n.id === selectedNodeId)
    return node ? { ...node } as unknown as Record<string, string> : {}
  }, [selectedNodeId, nodes])

  const handleNodeUpdate = async () => {
    if (!selectedNodeId) return
    await updateNode(selectedNodeId, nodeForm)
  }

  const handleDeleteNodeCheck = async (nodeId: string) => {
    try {
      const imp = await getDeleteImpact(nodeId)
      const hasImpact = imp && (
        (imp.relationships || 0) > 0 ||
        (imp.crossLayerRelationships || 0) > 0 ||
        (imp.reasoningPathSteps || 0) > 0 ||
        (imp.hyperedgeMembers || 0) > 0
      )
      if (hasImpact) {
        setImpact(imp)
        setShowDeleteConfirm(nodeId)
      } else {
        await deleteNode(nodeId)
        setShowDeleteConfirm(null)
        setImpact(null)
        setSelectedNodeId(null)
        setSelectedAnnotationId(null)
      }
    } catch {
      await deleteNode(nodeId)
      setShowDeleteConfirm(null)
      setImpact(null)
      setSelectedNodeId(null)
      setSelectedAnnotationId(null)
    }
  }

  const confirmDeleteNode = async () => {
    if (!showDeleteConfirm) return
    await deleteNode(showDeleteConfirm)
    setShowDeleteConfirm(null)
    setImpact(null)
    setSelectedNodeId(null)
    setSelectedAnnotationId(null)
  }

  const renderLayerInspector = () => {
    if (!activeLayer) return null
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const formData = new FormData()
      formData.append('file', file)
      formData.append('layerId', activeLayer.id)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        await updateLayer(activeLayer.id, { imagePath: data.imagePath })
      }
    }
    return (
      <div className="inspector-section">
        <h3>Active Layer</h3>
        <p className="text-sm font-bold text-[#0F172A]">{activeLayer.name}</p>
        {activeLayer.imagePath ? (
          <div className="mt-2.5 space-y-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeLayer.imagePath} alt="" className="w-full rounded-xl border border-[#E2E8F0] shadow-2xs" style={{ maxHeight: 130, objectFit: 'contain' }} />

            <div className="space-y-2 pt-2 border-t border-[#E2E8F0] text-xs">
              <span className="font-bold text-[#219EBC] block text-[11px]">Image Alignment & Scale</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#5A6E7F] block font-medium">Offset X (px)</label>
                  <input
                    type="number"
                    value={activeLayer.alignX || 0}
                    onChange={(e) => handleOffsetXChange(activeLayer.id, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs bg-white focus:outline-none focus:border-[#219EBC]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#5A6E7F] block font-medium">Offset Y (px)</label>
                  <input
                    type="number"
                    value={activeLayer.alignY || 0}
                    onChange={(e) => handleOffsetYChange(activeLayer.id, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs bg-white focus:outline-none focus:border-[#219EBC]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#5A6E7F] block font-medium">Scale ({(activeLayer.alignScale || 1).toFixed(2)}x)</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={activeLayer.alignScale || 1}
                  onChange={(e) => handleScaleChange(activeLayer.id, parseFloat(e.target.value) || 1)}
                  className="w-full h-1.5 accent-[#219EBC] cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => updateLayer(activeLayer.id, { imagePath: '' })}
              className="mt-1 text-xs text-red-500 hover:underline cursor-pointer font-medium"
            >
              Remove image
            </button>
          </div>
        ) : (
          <div className="mt-2.5">
            <label className="block text-xs text-[#5A6E7F] font-medium mb-1.5">Upload Image</label>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleUpload} className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EBF7FA] file:text-[#219EBC] hover:file:bg-[#219EBC] hover:file:text-white transition-colors cursor-pointer" />
          </div>
        )}
      </div>
    )
  }

  const renderNodeInspector = () => {
    if (!selectedNodeId) return null
    const node = nodes.find(n => n.id === selectedNodeId)
    if (!node) return null
    return (
      <div className="inspector-section">
        <div className="flex items-center justify-between mb-2.5">
          <h3>Concept Node</h3>
          <button onClick={() => handleDeleteNodeCheck(node.id)} className="text-xs text-red-500 hover:underline font-semibold cursor-pointer">Delete</button>
        </div>
        <div className="space-y-2.5 text-xs">
          <div>
            <label className="text-[#5A6E7F] font-medium block mb-0.5">Title</label>
            <input type="text" value={nodeForm.title || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { title: v }) }}
              className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:border-[#219EBC]" />
          </div>
          <div>
            <label className="text-[#5A6E7F] font-medium block mb-0.5">Short Definition</label>
            <input type="text" value={nodeForm.shortDefinition || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { shortDefinition: v }) }}
              className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:border-[#219EBC]" />
          </div>
          <div>
            <label className="text-[#5A6E7F] font-medium block mb-0.5">General Info</label>
            <textarea value={nodeForm.generalInfo || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { generalInfo: v }) }}
              className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white resize-none focus:outline-none focus:border-[#219EBC]" rows={3} />
          </div>
          <div>
            <label className="text-[#5A6E7F] font-medium block mb-0.5">Tags</label>
            <input type="text" value={nodeForm.tags || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { tags: v }) }}
              className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:border-[#219EBC]" placeholder="comma separated" />
          </div>
          <div>
            <label className="text-[#5A6E7F] font-medium block mb-0.5">Status</label>
            <select value={nodeForm.authoringStatus || 'draft'} onChange={e => useStore.getState().updateNode(node.id, { authoringStatus: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:border-[#219EBC]">
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          <button onClick={handleNodeUpdate} className="w-full px-4 py-2 bg-[#219EBC] hover:bg-[#1A86A1] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer">
            Save Changes
          </button>
        </div>

        {showDeleteConfirm === node.id && impact && (
          <div className="mt-3 p-3 border border-red-200 bg-red-50/50 rounded-xl text-xs">
            <p className="font-bold text-red-600 mb-1">Delete Impact Warning:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-red-700">
              {impact.relationships > 0 && <li>{impact.relationships} relationship(s)</li>}
              {impact.crossLayerRelationships > 0 && <li>{impact.crossLayerRelationships} cross-layer relationship(s)</li>}
              {impact.reasoningPathSteps > 0 && <li>{impact.reasoningPathSteps} reasoning step(s) in {impact.reasoningPaths} path(s)</li>}
              {impact.hyperedgeMembers > 0 && <li>{impact.hyperedgeMembers} hyperedge member(s) in {impact.hyperedges} hyperedge(s)</li>}
            </ul>
            <div className="flex gap-2 mt-2.5">
              <button onClick={confirmDeleteNode} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Confirm Delete</button>
              <button onClick={() => { setShowDeleteConfirm(null); setImpact(null) }} className="px-3 py-1 border border-[#E2E8F0] bg-white rounded-lg text-xs text-[#5A6E7F] cursor-pointer">Cancel</button>
            </div>
          </div>
        )}

        <div className="mt-3 text-[10px] text-[#5A6E7F] bg-[#F6F9FA] px-2 py-1 rounded-md border border-[#E2E8F0]">
          Layer: <strong className="text-[#0F172A]">{layers.find(l => l.id === node.layerId)?.name || 'Unknown'}</strong>
        </div>
      </div>
    )
  }

  const { selectedAnnotationIds } = useStore()

  const renderMultiSelectionInspector = () => {
    if (selectedAnnotationIds.length <= 1) return null
    return (
      <div className="inspector-section">
        <h3>Multi-Selection</h3>
        <p className="text-xs text-[#219EBC] font-bold mb-2">{selectedAnnotationIds.length} objects selected</p>
        <p className="text-[11px] text-[#5A6E7F] mb-3">You can drag any selected object on the canvas to move all selected objects together.</p>
        <button
          onClick={async () => {
            for (const id of selectedAnnotationIds) {
              const ann = useStore.getState().annotations.find(a => a.id === id)
              if (ann?.nodeId) {
                await useStore.getState().deleteNode(ann.nodeId)
              } else {
                await useStore.getState().deleteAnnotation(id)
              }
            }
            useStore.getState().setSelectedAnnotationIds([])
            useStore.getState().setSelectedNodeId(null)
          }}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          Delete All Selected ({selectedAnnotationIds.length})
        </button>
      </div>
    )
  }

  return (
    <div className="border-l border-[#E2E8F0] bg-white overflow-y-auto">
      {renderMultiSelectionInspector()}
      {selectedAnnotationIds.length <= 1 && renderLayerInspector()}
      {selectedAnnotationIds.length <= 1 && renderNodeInspector()}
      {selectedAnnotationIds.length === 0 && !selectedNodeId && (
        <div className="inspector-section">
          <h3>Selection Inspector</h3>
          <p className="text-xs text-[#5A6E7F]">Select a node, image layer, or drag a marquee box on the canvas to select objects.</p>
        </div>
      )}
    </div>
  )
}
