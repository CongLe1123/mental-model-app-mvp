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
        <p className="text-sm font-medium">{activeLayer.name}</p>
        {activeLayer.imagePath ? (
          <div className="mt-2 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeLayer.imagePath} alt="" className="w-full rounded border border-[var(--border)]" style={{ maxHeight: 120, objectFit: 'contain' }} />
            
            <div className="space-y-1.5 pt-1 border-t border-[var(--border)] text-xs">
              <span className="font-medium text-[var(--text-muted)] block text-[11px]">Image Alignment & Scale</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block">Offset X (px)</label>
                  <input
                    type="number"
                    value={activeLayer.alignX || 0}
                    onChange={(e) => handleOffsetXChange(activeLayer.id, parseFloat(e.target.value) || 0)}
                    className="w-full px-1.5 py-0.5 border border-[var(--border)] rounded text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block">Offset Y (px)</label>
                  <input
                    type="number"
                    value={activeLayer.alignY || 0}
                    onChange={(e) => handleOffsetYChange(activeLayer.id, parseFloat(e.target.value) || 0)}
                    className="w-full px-1.5 py-0.5 border border-[var(--border)] rounded text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block">Scale ({(activeLayer.alignScale || 1).toFixed(2)}x)</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={activeLayer.alignScale || 1}
                  onChange={(e) => handleScaleChange(activeLayer.id, parseFloat(e.target.value) || 1)}
                  className="w-full h-1"
                />
              </div>
            </div>

            <button
              onClick={() => updateLayer(activeLayer.id, { imagePath: '' })}
              className="mt-1 text-xs text-[var(--danger)] hover:underline"
            >
              Remove image
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Upload Image</label>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleUpload} className="text-xs" />
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
        <div className="flex items-center justify-between mb-2">
          <h3>Concept Node</h3>
          <button onClick={() => handleDeleteNodeCheck(node.id)} className="text-xs text-[var(--danger)] hover:underline">Delete</button>
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <label className="text-[var(--text-muted)] block">Title</label>
            <input type="text" value={nodeForm.title || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { title: v }) }}
              className="w-full px-2 py-1 border border-[var(--border)] rounded" />
          </div>
          <div>
            <label className="text-[var(--text-muted)] block">Short Definition</label>
            <input type="text" value={nodeForm.shortDefinition || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { shortDefinition: v }) }}
              className="w-full px-2 py-1 border border-[var(--border)] rounded" />
          </div>
          <div>
            <label className="text-[var(--text-muted)] block">General Info</label>
            <textarea value={nodeForm.generalInfo || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { generalInfo: v }) }}
              className="w-full px-2 py-1 border border-[var(--border)] rounded" rows={3} />
          </div>
          <div>
            <label className="text-[var(--text-muted)] block">Tags</label>
            <input type="text" value={nodeForm.tags || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { tags: v }) }}
              className="w-full px-2 py-1 border border-[var(--border)] rounded" placeholder="comma separated" />
          </div>
          <div>
            <label className="text-[var(--text-muted)] block">Status</label>
            <select value={nodeForm.authoringStatus || 'draft'} onChange={e => useStore.getState().updateNode(node.id, { authoringStatus: e.target.value })}
              className="w-full px-2 py-1 border border-[var(--border)] rounded">
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          <button onClick={handleNodeUpdate} className="w-full px-3 py-1.5 bg-[var(--accent)] text-white rounded text-xs font-medium">
            Save
          </button>
        </div>

        {showDeleteConfirm === node.id && impact && (
          <div className="mt-2 p-2 border border-[var(--danger)] rounded text-xs">
            <p className="font-medium text-[var(--danger)] mb-1">Delete Impact:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {impact.relationships > 0 && <li>{impact.relationships} relationship(s)</li>}
              {impact.crossLayerRelationships > 0 && <li>{impact.crossLayerRelationships} cross-layer relationship(s)</li>}
              {impact.reasoningPathSteps > 0 && <li>{impact.reasoningPathSteps} reasoning step(s) in {impact.reasoningPaths} path(s)</li>}
              {impact.hyperedgeMembers > 0 && <li>{impact.hyperedgeMembers} hyperedge member(s) in {impact.hyperedges} hyperedge(s)</li>}
            </ul>
            <div className="flex gap-2 mt-2">
              <button onClick={confirmDeleteNode} className="px-2 py-1 bg-[var(--danger)] text-white rounded text-xs">Confirm Delete</button>
              <button onClick={() => { setShowDeleteConfirm(null); setImpact(null) }} className="px-2 py-1 border rounded text-xs">Cancel</button>
            </div>
          </div>
        )}

        <div className="mt-2 text-[10px] text-[var(--text-muted)]">
          Layer: {layers.find(l => l.id === node.layerId)?.name || 'Unknown'}
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
        <p className="text-xs text-[var(--accent)] font-medium mb-2">{selectedAnnotationIds.length} objects selected</p>
        <p className="text-[11px] text-[var(--text-muted)] mb-3">You can drag any selected object on the canvas to move all selected objects together.</p>
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
          className="w-full px-3 py-1.5 bg-[var(--danger)] text-white rounded text-xs font-medium"
        >
          Delete All Selected ({selectedAnnotationIds.length})
        </button>
      </div>
    )
  }

  return (
    <div className="border-l border-[var(--border)] bg-[var(--surface)] overflow-y-auto">
      {renderMultiSelectionInspector()}
      {selectedAnnotationIds.length <= 1 && renderLayerInspector()}
      {selectedAnnotationIds.length <= 1 && renderNodeInspector()}
      {selectedAnnotationIds.length === 0 && !selectedNodeId && (
        <div className="inspector-section">
          <h3>Selection</h3>
          <p className="text-xs text-[var(--text-muted)]">Select a node, image layer, or drag a selection box to select multiple objects.</p>
        </div>
      )}
    </div>
  )
}
