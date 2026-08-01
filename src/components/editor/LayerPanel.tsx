'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function LayerPanel() {
  const {
    layers, activeLayerId, setActiveLayerId, updateLayer, deleteLayer,
    createLayer, cloneLayer, reorderLayers, currentOrganId, annotations
  } = useStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newLayerName, setNewLayerName] = useState('')
  
  // Drag to reorder state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // Sort layers by order (display highest order at top like Photoshop, or standard order)
  const sortedLayers = [...layers].sort((a, b) => b.order - a.order)

  const activeLayer = layers.find(l => l.id === activeLayerId)

  const handleCreateLayer = async () => {
    if (!newLayerName.trim() || !currentOrganId) return
    await createLayer(currentOrganId, newLayerName.trim())
    setNewLayerName('')
    setShowCreateModal(false)
  }

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(id)
    setEditingName(currentName)
  }

  const handleSaveRename = async (id: string) => {
    if (editingName.trim() && editingName !== layers.find(l => l.id === id)?.name) {
      // Optimistic update
      useStore.setState({
        layers: layers.map(l => l.id === id ? { ...l, name: editingName.trim() } : l)
      })
      await updateLayer(id, { name: editingName.trim() })
    }
    setEditingId(null)
  }

  const handleOpacityChange = (opacity: number) => {
    if (!activeLayer) return
    // Optimistic UI update
    useStore.setState({
      layers: layers.map(l => l.id === activeLayer.id ? { ...l, opacity } : l)
    })

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      updateLayer(activeLayer.id, { opacity })
    }, 300)
  }

  // Drag & Drop handlers for layer reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...sortedLayers]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(index, 0, moved)

    // Assign new reverse order indices
    const updatedIds = reordered.map(l => l.id).reverse()

    // Optimistic store update
    const updatedLayers = layers.map(l => {
      const newOrder = updatedIds.indexOf(l.id)
      return { ...l, order: newOrder }
    })
    useStore.setState({ layers: updatedLayers })

    setDraggedIndex(null)
    setDragOverIndex(null)

    await reorderLayers(updatedIds)
  }

  const handleMoveLayer = async (direction: 'up' | 'down') => {
    if (!activeLayer) return
    const currentIndex = sortedLayers.findIndex(l => l.id === activeLayer.id)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedLayers.length) return

    const reordered = [...sortedLayers]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    const updatedIds = reordered.map(l => l.id).reverse()
    await reorderLayers(updatedIds)
  }

  const handleDuplicateActive = async () => {
    if (!activeLayer) return
    await cloneLayer(activeLayer.id, `${activeLayer.name} Copy`)
  }

  const handleDeleteActive = async () => {
    if (!activeLayer) return
    if (confirm(`Delete layer "${activeLayer.name}" and all its contents?`)) {
      await deleteLayer(activeLayer.id)
    }
  }

  return (
    <div className="flex flex-col h-full border-r border-[var(--border)] bg-[var(--surface)] select-none text-xs">
      {/* Panel Header */}
      <div className="p-2.5 border-b border-[var(--border)] bg-[var(--surface-hover)]/40 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wider uppercase text-[var(--text-muted)]">
          <span>Layers</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[var(--border)] text-[10px] font-normal text-[var(--foreground)]">
            {layers.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-2 py-1 bg-[var(--accent)] text-white rounded text-[11px] font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
          title="Create New Layer"
        >
          <span>+</span> New Layer
        </button>
      </div>

      {/* Photoshop Style Layer Controls Bar (Opacity & Visibility) */}
      {activeLayer && (
        <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Opacity: <strong className="text-[var(--foreground)]">{Math.round(activeLayer.opacity * 100)}%</strong></span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateLayer(activeLayer.id, { visible: !activeLayer.visible })}
                className={`p-1 rounded hover:bg-[var(--surface-hover)] ${activeLayer.visible ? 'text-[var(--foreground)]' : 'opacity-40'}`}
                title={activeLayer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {activeLayer.visible ? '👁️' : '🕶️'}
              </button>
              <button
                onClick={() => updateLayer(activeLayer.id, { locked: !activeLayer.locked })}
                className={`p-1 rounded hover:bg-[var(--surface-hover)] ${activeLayer.locked ? 'text-[var(--warning)]' : 'opacity-40'}`}
                title={activeLayer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {activeLayer.locked ? '🔒' : '🔓'}
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={activeLayer.opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-full h-1 cursor-pointer accent-[var(--accent)]"
          />
        </div>
      )}

      {/* Inline Create Modal */}
      {showCreateModal && (
        <div className="p-2 border-b border-[var(--accent)] bg-blue-50/50">
          <input
            type="text"
            value={newLayerName}
            onChange={e => setNewLayerName(e.target.value)}
            placeholder="Layer name..."
            className="w-full px-2 py-1 border border-[var(--border)] rounded text-xs mb-1.5 bg-[var(--surface)]"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateLayer()
              if (e.key === 'Escape') setShowCreateModal(false)
            }}
          />
          <div className="flex gap-1 justify-end">
            <button onClick={handleCreateLayer} className="px-2 py-0.5 bg-[var(--accent)] text-white rounded text-[10px]">Add</button>
            <button onClick={() => setShowCreateModal(false)} className="px-2 py-0.5 border rounded text-[10px]">Cancel</button>
          </div>
        </div>
      )}

      {/* Layer List Container */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {sortedLayers.length === 0 && (
          <div className="py-12 text-center text-[var(--text-muted)] text-xs">
            No layers found.<br />Click "+ New Layer" to add one.
          </div>
        )}

        {sortedLayers.map((layer, index) => {
          const isActive = layer.id === activeLayerId
          const annCount = annotations.filter(a => a.layerId === layer.id).length
          const isDragging = draggedIndex === index
          const isDragOver = dragOverIndex === index

          return (
            <div
              key={layer.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onClick={() => setActiveLayerId(layer.id)}
              className={`group relative flex items-center gap-2 p-1.5 rounded border transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50/80 border-[var(--accent)] text-[var(--accent)] font-medium shadow-sm ring-1 ring-blue-300/50'
                  : 'bg-[var(--surface)] border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-hover)]'
              } ${isDragging ? 'opacity-40 border-dashed border-gray-400' : ''} ${
                isDragOver ? 'border-t-2 border-t-[var(--accent)]' : ''
              }`}
            >
              {/* Drag handle grip */}
              <span className="text-[var(--text-muted)] cursor-grab hover:text-[var(--foreground)] opacity-40 group-hover:opacity-100 text-[10px]">
                ⋮⋮
              </span>

              {/* Visibility Toggle Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  updateLayer(layer.id, { visible: !layer.visible })
                }}
                className={`text-[12px] p-0.5 hover:scale-110 transition-transform ${layer.visible ? 'opacity-100' : 'opacity-25'}`}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                👁️
              </button>

              {/* Visual Thumbnail */}
              <div className="w-7 h-7 rounded border border-[var(--border)] bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 relative">
                {layer.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={layer.imagePath} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">{layer.name.slice(0, 2)}</span>
                )}
                {!layer.visible && <div className="absolute inset-0 bg-black/20" />}
              </div>

              {/* Layer Title (Double Click to Rename) */}
              <div className="flex-1 min-w-0 pr-1" onDoubleClick={(e) => handleStartRename(layer.id, layer.name, e)}>
                {editingId === layer.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={() => handleSaveRename(layer.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveRename(layer.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="w-full px-1 py-0.5 text-xs border border-[var(--accent)] rounded bg-[var(--surface)] text-[var(--foreground)]"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-normal" title={layer.name}>
                      {layer.name}
                    </span>
                    {annCount > 0 && (
                      <span className="ml-1 text-[9px] px-1 rounded-full bg-gray-200 text-gray-700 font-mono">
                        {annCount}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Lock Icon Indicator */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  updateLayer(layer.id, { locked: !layer.locked })
                }}
                className={`text-[11px] p-0.5 ${layer.locked ? 'opacity-100 text-[var(--warning)]' : 'opacity-0 group-hover:opacity-40'}`}
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Professional Photoshop Bottom Action Bar */}
      <div className="p-1.5 border-t border-[var(--border)] bg-[var(--surface-hover)]/40 flex items-center justify-around text-sm">
        <button
          onClick={() => handleMoveLayer('up')}
          disabled={!activeLayer || sortedLayers.findIndex(l => l.id === activeLayer.id) === 0}
          className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent"
          title="Move Layer Up"
        >
          ▲
        </button>
        <button
          onClick={() => handleMoveLayer('down')}
          disabled={!activeLayer || sortedLayers.findIndex(l => l.id === activeLayer.id) === sortedLayers.length - 1}
          className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent"
          title="Move Layer Down"
        >
          ▼
        </button>
        <button
          onClick={handleDuplicateActive}
          disabled={!activeLayer}
          className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent"
          title="Duplicate Active Layer"
        >
          ⧉
        </button>
        <button
          onClick={handleDeleteActive}
          disabled={!activeLayer}
          className="p-1 text-[var(--danger)] rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent"
          title="Delete Active Layer"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

