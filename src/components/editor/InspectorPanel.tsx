'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
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

  const handleScaleChange = useCallback((layerId: string, alignScale: number) => {
    useStore.setState({
      layers: layers.map(l => l.id === layerId ? { ...l, alignScale } : l)
    })

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateLayer(layerId, { alignScale })
    }, 300)
  }, [layers, updateLayer])

  const handleOffsetXChange = useCallback((layerId: string, alignX: number) => {
    useStore.setState({
      layers: layers.map(l => l.id === layerId ? { ...l, alignX } : l)
    })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateLayer(layerId, { alignX })
    }, 300)
  }, [layers, updateLayer])

  const handleOffsetYChange = useCallback((layerId: string, alignY: number) => {
    useStore.setState({
      layers: layers.map(l => l.id === layerId ? { ...l, alignY } : l)
    })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateLayer(layerId, { alignY })
    }, 300)
  }, [layers, updateLayer])

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
        <h3>ACTIVE LAYER</h3>
        <p className="text-sm font-black text-black uppercase">{activeLayer.name}</p>
        {activeLayer.imagePath ? (
          <div className="mt-3 space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeLayer.imagePath} alt="" className="w-full border-2 border-black shadow-[2px_2px_0px_#000]" style={{ maxHeight: 130, objectFit: 'contain' }} />

            <div className="space-y-2.5 pt-2 border-t-2 border-black text-xs font-bold">
              <span className="font-black text-black block text-xs uppercase">IMAGE ALIGNMENT & SCALE</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-black font-extrabold uppercase block mb-1">OFFSET X (PX)</label>
                  <input
                    type="number"
                    value={activeLayer.alignX || 0}
                    // eslint-disable-next-line react-hooks/refs
                    onChange={(e) => handleOffsetXChange(activeLayer.id, parseFloat(e.target.value) || 0)}
                    className="neo-input w-full px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-black font-extrabold uppercase block mb-1">OFFSET Y (PX)</label>
                  <input
                    type="number"
                    value={activeLayer.alignY || 0}
                    onChange={(e) => handleOffsetYChange(activeLayer.id, parseFloat(e.target.value) || 0)}
                    className="neo-input w-full px-2 py-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-black font-extrabold uppercase block mb-1">SCALE ({(activeLayer.alignScale || 1).toFixed(2)}X)</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={activeLayer.alignScale || 1}
                  onChange={(e) => handleScaleChange(activeLayer.id, parseFloat(e.target.value) || 1)}
                  className="w-full h-2 accent-black bg-white border border-black cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => updateLayer(activeLayer.id, { imagePath: '' })}
              className="neo-btn neo-btn-danger px-3 py-1 text-xs w-full"
            >
              REMOVE IMAGE
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-black uppercase text-black">UPLOAD IMAGE</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleUpload}
              className="neo-input text-xs w-full p-1.5 file:mr-2 file:py-1 file:px-3 file:border-2 file:border-black file:text-xs file:font-black file:bg-[var(--primary)] file:text-black hover:file:bg-[var(--primary-hover)] transition-colors cursor-pointer"
            />
          </div>
        )}
      </div>
    )
  }

  const renderNodeInspector = () => {
    if (!selectedNodeId) return null
    const node = nodes.find(n => n.id === selectedNodeId)
    if (!node) return null

    const nodeRelationships = (useStore.getState().relationships || []).filter(
      r => r.sourceNodeId === node.id || r.targetNodeId === node.id
    )

    const nodeTrails = (useStore.getState().reasoningPaths || []).filter(
      p => p.steps?.some(s => s.nodeId === node.id)
    )

    return (
      <div className="inspector-section">
        <div className="flex items-center justify-between mb-3">
          <h3>CONCEPT NODE</h3>
          <button onClick={() => handleDeleteNodeCheck(node.id)} className="neo-btn neo-btn-danger px-2.5 py-1 text-xs">
            DELETE
          </button>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">TITLE *</label>
            <input type="text" value={nodeForm.title || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { title: v }) }}
              className="neo-input w-full px-3 py-1.5 text-xs" placeholder="Primary Title" />
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">CANONICAL NAME</label>
            <input type="text" value={nodeForm.canonicalName || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { canonicalName: v }) }}
              className="neo-input w-full px-3 py-1.5 text-xs" placeholder="e.g. Arteria bronchialis" />
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">CATEGORY</label>
            <select value={nodeForm.category || ''} onChange={e => useStore.getState().updateNode(node.id, { category: e.target.value })}
              className="neo-input w-full px-3 py-1.5 text-xs font-bold">
              <option value="">Select Category...</option>
              <option value="Anatomy">Anatomy</option>
              <option value="Physiology">Physiology</option>
              <option value="Pathology">Pathology</option>
              <option value="Symptom">Symptom / Sign</option>
              <option value="Biomarker">Biomarker / Lab</option>
              <option value="Drug">Drug / Therapy</option>
              <option value="Process">Process / Pathway</option>
              <option value="Function">Function</option>
              <option value="General">General Concept</option>
            </select>
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">ALIASES</label>
            <input type="text" value={nodeForm.aliases || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { aliases: v }) }}
              className="neo-input w-full px-3 py-1.5 text-xs" placeholder="Synonyms / alternate names" />
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">SHORT DEFINITION</label>
            <input type="text" value={nodeForm.shortDefinition || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { shortDefinition: v }) }}
              className="neo-input w-full px-3 py-1.5 text-xs" placeholder="Brief definition" />
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">ANATOMICAL LOCATION</label>
            <input type="text" value={nodeForm.anatomicalLocation || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { anatomicalLocation: v }) }}
              className="neo-input w-full px-3 py-1.5 text-xs" placeholder="e.g. Left Atrium, Anterior Mediastinum" />
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">GENERAL INFORMATION</label>
            <textarea value={nodeForm.generalInfo || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { generalInfo: v }) }}
              className="neo-input w-full px-3 py-1.5 text-xs resize-none" rows={3} placeholder="General information, clinical relevance, facts..." />
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">EDITOR COMMENT</label>
            <textarea value={nodeForm.editorComment || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { editorComment: v }) }}
              className="neo-input w-full px-3 py-1.5 text-xs resize-none" rows={2} placeholder="Authoring notes, review comments..." />
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">SUGGESTED TRAILS</label>
            <input type="text" value={nodeForm.suggestedTrails || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { suggestedTrails: v }) }}
              className="neo-input w-full px-3 py-1.5 text-xs" placeholder="Recommended reasoning paths / trails" />
            {nodeTrails.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {nodeTrails.map(t => (
                  <span key={t.id} className="neo-badge bg-[var(--primary-light)] text-black">
                    Trail: {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Relations Section */}
          <div className="pt-2 border-t-2 border-black">
            <label className="text-black font-black uppercase text-[11px] block mb-1.5">RELATIONS ({nodeRelationships.length})</label>
            {nodeRelationships.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {nodeRelationships.map(r => {
                  const isSource = r.sourceNodeId === node.id
                  const otherNodeId = isSource ? r.targetNodeId : r.sourceNodeId
                  const otherNode = nodes.find(n => n.id === otherNodeId)
                  return (
                    <div key={r.id} className="flex items-center gap-1.5 text-xs p-2 bg-[#FFFDF5] border-2 border-black font-bold">
                      <span className="font-black text-black">{isSource ? '→ OUT' : '← IN'}</span>
                      <span className="font-mono text-[10px] text-black bg-[var(--primary)] px-1 border border-black">[{r.type}]</span>
                      <span className="truncate flex-1 text-black">{otherNode?.title || 'Unknown node'}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-[#444444] font-semibold italic">No relationships connected to this node yet.</p>
            )}
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">TAGS</label>
            <input type="text" value={nodeForm.tags || ''} onChange={e => { const v = e.target.value; useStore.getState().updateNode(node.id, { tags: v }) }}
              className="neo-input w-full px-3 py-1.5 text-xs" placeholder="comma separated" />
          </div>

          <div>
            <label className="text-black font-black uppercase text-[11px] block mb-1">STATUS</label>
            <select value={nodeForm.authoringStatus || 'draft'} onChange={e => useStore.getState().updateNode(node.id, { authoringStatus: e.target.value })}
              className="neo-input w-full px-3 py-1.5 text-xs font-bold">
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          <button onClick={handleNodeUpdate} className="neo-btn neo-btn-primary w-full py-2 text-xs font-black">
            SAVE CHANGES
          </button>
        </div>

        {showDeleteConfirm === node.id && impact && (
          <div className="mt-3 p-3 border-2 border-black bg-[var(--danger-light)] text-xs font-bold space-y-2">
            <p className="font-black text-[var(--danger)] uppercase">DELETE IMPACT WARNING:</p>
            <ul className="list-disc pl-4 space-y-1 text-black">
              {impact.relationships > 0 && <li>{impact.relationships} relationship(s)</li>}
              {impact.crossLayerRelationships > 0 && <li>{impact.crossLayerRelationships} cross-layer relationship(s)</li>}
              {impact.reasoningPathSteps > 0 && <li>{impact.reasoningPathSteps} reasoning step(s) in {impact.reasoningPaths} path(s)</li>}
              {impact.hyperedgeMembers > 0 && <li>{impact.hyperedgeMembers} hyperedge member(s) in {impact.hyperedges} hyperedge(s)</li>}
            </ul>
            <div className="flex gap-2 pt-1">
              <button onClick={confirmDeleteNode} className="neo-btn neo-btn-danger px-3 py-1 text-xs font-black">CONFIRM DELETE</button>
              <button onClick={() => { setShowDeleteConfirm(null); setImpact(null) }} className="neo-btn neo-btn-white px-3 py-1 text-xs font-bold">CANCEL</button>
            </div>
          </div>
        )}

        <div className="mt-3 text-xs font-bold text-black bg-[var(--surface-alt)] px-3 py-1.5 border-2 border-black">
          LAYER: <strong className="font-black text-black uppercase">{layers.find(l => l.id === node.layerId)?.name || 'UNKNOWN'}</strong>
        </div>
      </div>
    )
  }

  const { selectedAnnotationIds } = useStore()

  const renderMultiSelectionInspector = () => {
    if (selectedAnnotationIds.length <= 1) return null
    return (
      <div className="inspector-section">
        <h3>MULTI-SELECTION</h3>
        <p className="text-xs font-black text-black bg-[var(--secondary)] border-2 border-black p-2 mb-3 inline-block shadow-[2px_2px_0px_#000]">
          {selectedAnnotationIds.length} OBJECTS SELECTED
        </p>
        <p className="text-xs font-semibold text-[#333333] mb-4">You can drag any selected object on the canvas to move all selected objects together.</p>
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
          className="neo-btn neo-btn-danger w-full py-2 text-xs font-black"
        >
          DELETE ALL SELECTED ({selectedAnnotationIds.length})
        </button>
      </div>
    )
  }

  return (
    <div className="border-l-2.5 border-black bg-white overflow-y-auto">
      {renderMultiSelectionInspector()}
      {selectedAnnotationIds.length <= 1 && renderLayerInspector()}
      {selectedAnnotationIds.length <= 1 && renderNodeInspector()}
      {selectedAnnotationIds.length === 0 && !selectedNodeId && (
        <div className="inspector-section">
          <h3>SELECTION INSPECTOR</h3>
          <p className="text-xs font-semibold text-[#333333]">Select a node, image layer, or drag a marquee box on the canvas to select objects.</p>
        </div>
      )}
    </div>
  )
}
