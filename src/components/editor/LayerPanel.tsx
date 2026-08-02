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
    <div className="flex flex-col h-full border-r-2.5 border-black bg-white select-none text-xs">
      {/* Panel Header */}
      <div className="p-3 border-b-2 border-black bg-[var(--surface-alt)] flex items-center justify-between">
        <div className="flex items-center gap-2 font-black text-xs tracking-wider uppercase text-black">
          <span className="w-3 h-3 border border-black bg-[var(--primary)]" />
          <span>LAYERS</span>
          <span className="neo-badge bg-[var(--primary)] text-black">
            {layers.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="neo-btn neo-btn-primary px-2.5 py-1 text-[11px] font-black"
          title="Create New Layer"
        >
          + NEW LAYER
        </button>
      </div>

      {/* Layer Controls Bar (Opacity & Visibility) */}
      {activeLayer && (
        <div className="px-3 py-2.5 border-b-2 border-black bg-[var(--primary-light)] space-y-2">
          <div className="flex items-center justify-between text-xs text-black font-bold">
            <span>OPACITY: <strong className="font-black text-black">{Math.round(activeLayer.opacity * 100)}%</strong></span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateLayer(activeLayer.id, { visible: !activeLayer.visible })}
                className={`neo-btn neo-btn-white p-1 text-xs ${activeLayer.visible ? '' : 'opacity-40'}`}
                title={activeLayer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {activeLayer.visible ? '👁️' : '🕶️'}
              </button>
              <button
                onClick={() => updateLayer(activeLayer.id, { locked: !activeLayer.locked })}
                className={`neo-btn neo-btn-white p-1 text-xs ${activeLayer.locked ? 'bg-[var(--warning)]' : 'opacity-40'}`}
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
            className="w-full h-2 cursor-pointer accent-black bg-white border border-black"
          />
        </div>
      )}

      {/* Inline Create Modal */}
      {showCreateModal && (
        <div className="p-3 border-b-2 border-black bg-[var(--secondary-light)] space-y-2">
          <input
            type="text"
            value={newLayerName}
            onChange={e => setNewLayerName(e.target.value)}
            placeholder="Layer name..."
            className="neo-input w-full px-2.5 py-1.5 text-xs bg-white"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateLayer()
              if (e.key === 'Escape') setShowCreateModal(false)
            }}
          />
          <div className="flex gap-1.5 justify-end">
            <button onClick={handleCreateLayer} className="neo-btn neo-btn-secondary px-3 py-1 text-xs font-black">ADD</button>
            <button onClick={() => setShowCreateModal(false)} className="neo-btn neo-btn-white px-3 py-1 text-xs font-bold">CANCEL</button>
          </div>
        </div>
      )}

      {/* Layer List Container */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {sortedLayers.length === 0 && (
          <div className="py-12 text-center text-black font-bold text-xs bg-[var(--surface-alt)] border-2 border-black p-4">
            No layers found.<br />Click &quot;+ NEW LAYER&quot; to add one.
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
              className={`group relative flex items-center gap-2 p-2.5 border-2 border-black transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--secondary-light)] border-l-6 border-l-black font-black shadow-[3px_3px_0px_#000]'
                  : 'bg-white hover:bg-[var(--surface-alt)] text-black shadow-[2px_2px_0px_#000]'
              } ${isDragging ? 'opacity-40 border-dashed' : ''} ${
                isDragOver ? 'border-t-4 border-t-black' : ''
              }`}
            >
              {/* Drag handle grip */}
              <span className="text-black font-black cursor-grab opacity-60 group-hover:opacity-100 text-xs">
                ⋮⋮
              </span>

              {/* Visibility Toggle Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  updateLayer(layer.id, { visible: !layer.visible })
                }}
                className={`text-xs p-0.5 ${layer.visible ? 'opacity-100' : 'opacity-30'}`}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                👁️
              </button>

              {/* Visual Thumbnail */}
              <div className="w-8 h-8 border-2 border-black bg-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative shadow-[1px_1px_0px_#000]">
                {layer.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={layer.imagePath} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-black font-mono font-black uppercase">{layer.name.slice(0, 2)}</span>
                )}
                {!layer.visible && <div className="absolute inset-0 bg-black/40" />}
              </div>

              {/* Layer Title */}
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
                    className="neo-input w-full px-1.5 py-0.5 text-xs bg-white"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-black text-black" title={layer.name}>
                      {layer.name}
                    </span>
                    {annCount > 0 && (
                      <span className="neo-badge bg-[var(--primary)] text-black ml-1">
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
                className={`text-xs p-0.5 ${layer.locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Photoshop Bottom Action Bar */}
      <div className="p-2 border-t-2.5 border-black bg-[var(--surface-alt)] flex items-center justify-around text-xs">
        <button
          onClick={() => handleMoveLayer('up')}
          disabled={!activeLayer || sortedLayers.findIndex(l => l.id === activeLayer.id) === 0}
          className="neo-btn neo-btn-white p-1.5 font-black"
          title="Move Layer Up"
        >
          ▲
        </button>
        <button
          onClick={() => handleMoveLayer('down')}
          disabled={!activeLayer || sortedLayers.findIndex(l => l.id === activeLayer.id) === sortedLayers.length - 1}
          className="neo-btn neo-btn-white p-1.5 font-black"
          title="Move Layer Down"
        >
          ▼
        </button>
        <button
          onClick={handleDuplicateActive}
          disabled={!activeLayer}
          className="neo-btn neo-btn-white p-1.5 font-black"
          title="Duplicate Active Layer"
        >
          ⧉
        </button>
        <button
          onClick={handleDeleteActive}
          disabled={!activeLayer}
          className="neo-btn neo-btn-danger p-1.5 font-black"
          title="Delete Active Layer"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
